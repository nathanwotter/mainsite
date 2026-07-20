import { createHash } from "node:crypto";
import { getVisibleRooms, validateRoomMappings } from "@/config/rooms";
import { conferenceRoomsPath, getArchieSpaceDomain } from "@/lib/archie/areas";
import { archieFetch } from "@/lib/archie/client";
import { collectPages } from "@/lib/archie/pagination";
import {
  practitionerDisplayNameForBooking,
  resolvePractitionerIdentities,
  type PractitionerResolutionDiagnostics,
  type PractitionerIdentity,
} from "@/lib/archie/practitioners";
import {
  archieErrorResponseSchema,
  conferenceRoomsResponseSchema,
  getConferenceRoomsFromResponse,
  getConferenceRoomsPagination,
  paginatedBookingsSchema,
  type ArchieArea,
  type ArchieBooking,
} from "@/lib/archie/schemas";
import { ArchieSchemaChangedError, approvalDecision, mapArchieReservationStatus, type ArchieScheduleAdapter } from "@/lib/archie/types";
import type { ScheduleLoadDiagnostics } from "@/lib/archie/types";
import { logRefreshDebug } from "@/lib/debug/refresh";
import { displayWindow, parseScheduleDate } from "@/lib/schedule/dateRange";
import type { RoomReservation } from "@/lib/schedule/types";

function diagnosticLog(diagnostics: ScheduleLoadDiagnostics | undefined, fields: Record<string, unknown>) {
  logRefreshDebug({
    refresh_id: diagnostics?.refreshId,
    trigger: diagnostics?.trigger,
    ...fields,
  });
}

function safeArchieError(body: unknown) {
  const parsed = archieErrorResponseSchema.safeParse(body);
  if (!parsed.success) return {};
  const error = parsed.data.error;
  const record = error && typeof error === "object" && !Array.isArray(error) ? error as Record<string, unknown> : {};
  return {
    safe_archie_error_code: typeof record.code === "string" ? record.code : typeof record.message_code === "string" ? record.message_code : undefined,
    safe_archie_error_message: typeof record.message === "string" ? record.message.slice(0, 300) : typeof error === "string" ? error.slice(0, 300) : undefined,
    request_uuid: parsed.data.request_uuid,
  };
}

function zodIssuePaths(error: { issues: Array<{ path: Array<string | number> }> }) {
  return error.issues.map((issue) => issue.path.join(".") || "<root>");
}

export class LiveArchieScheduleAdapter implements ArchieScheduleAdapter {
  async getDailySchedule(date: string, timezone: string, diagnostics?: ScheduleLoadDiagnostics) {
    const duplicates = validateRoomMappings();
    if (duplicates.length > 0) {
      throw new Error(`Duplicate Archie room configuration: ${duplicates.join(", ")}`);
    }

    const rooms = getVisibleRooms();
    const roomIds = new Set(rooms.map((room) => room.id));
    const spaceDomain = getArchieSpaceDomain();
    if (!spaceDomain) throw new Error("ARCHIE_SPACE_DOMAIN or ARCHIE_LOCATION_ID is required");
    const dateRange = parseScheduleDate(date, timezone);
    if (!dateRange) throw new Error("Invalid schedule date");

    const areas = await loadAreas(spaceDomain, diagnostics);
    for (const area of areas) {
      const id = area.uuid || area.slug;
      if (id && !roomIds.has(id)) console.warn("Unknown Archie area ignored by room-board configuration.");
    }

    const bookingEndpointPath = `/spaces/${encodeURIComponent(spaceDomain)}/bookings`;
    const bookings = await collectPages<ArchieBooking>(async (startAfter) => {
      const params = new URLSearchParams({
        limit: "100",
        itemType: "area",
        startDate: dateRange.startUtc.toISOString(),
        endDate: dateRange.endUtc.toISOString(),
      });
      params.append("types[]", "booking");
      params.append("categories[]", "conference-room");
      params.append("categories[]", "office");
      if (startAfter) params.set("startAfter", startAfter);
      const endpointPath = `${bookingEndpointPath}?${params.toString()}`;
      const response = await archieFetch(endpointPath);
      const body = await response.json() as unknown;
      diagnosticLog(diagnostics, {
        stage: "bookings request",
        endpoint_path: bookingEndpointPath,
        query_parameter_names: Array.from(params.keys()).sort(),
        http_status: response.status,
        ...safeArchieError(body),
      });
      if (!response.ok) throw new Error(`Archie bookings request failed: ${response.status}`);
      const parsed = paginatedBookingsSchema.safeParse(body);
      diagnosticLog(diagnostics, {
        stage: "bookings response parsing",
        endpoint_path: bookingEndpointPath,
        query_parameter_names: Array.from(params.keys()).sort(),
        http_status: response.status,
        returned_record_count: parsed.success ? parsed.data.data.length : undefined,
        zod_issue_paths: parsed.success ? [] : zodIssuePaths(parsed.error),
      });
      if (!parsed.success) throw new ArchieSchemaChangedError("Archie booking schema changed");
      return parsed.data;
    });

    const window = displayWindow(date, timezone, 0, 24);
    const bookingsWithMatchedRooms = bookings.filter((booking) => {
      const roomId = booking.conference_room?.uuid || booking.item_uuid || booking.conference_room?.slug;
      return Boolean(roomId && roomIds.has(roomId));
    });
    diagnosticLog(diagnostics, {
      stage: "booking-to-room matching",
      endpoint_path: bookingEndpointPath,
      returned_record_count: bookings.length,
      matched_room_count: bookingsWithMatchedRooms.length,
    });
    const practitionerDiagnostics: PractitionerResolutionDiagnostics = { attempted: 0, succeeded: 0, failed: 0, failureMessages: [] };
    const practitionerIdentities = await resolvePractitionerIdentities(bookings, spaceDomain, practitionerDiagnostics, diagnostics);
    diagnosticLog(diagnostics, {
      stage: "practitioner resolution",
      endpoint_path: `/spaces/${encodeURIComponent(spaceDomain)}/users/{userUUID}`,
      practitioner_lookups_attempted: practitionerDiagnostics.attempted,
      practitioner_lookups_succeeded: practitionerDiagnostics.succeeded,
      practitioner_lookups_failed: practitionerDiagnostics.failed,
      beneficiary_group_resolution_failures: practitionerDiagnostics.failed,
      exact_exception: practitionerDiagnostics.failureMessages?.[0],
    });
    const reservations = buildNormalizedReservations(bookings, roomIds, practitionerIdentities, diagnostics)
      .filter((reservation) => new Date(reservation.start) < window.end && new Date(reservation.end) > window.start)
      .sort((a, b) => a.roomId.localeCompare(b.roomId) || a.start.localeCompare(b.start));
    diagnosticLog(diagnostics, {
      stage: "final normalization",
      endpoint_path: bookingEndpointPath,
      returned_record_count: bookings.length,
      matched_room_count: reservations.length,
      practitioner_lookups_attempted: practitionerDiagnostics.attempted,
      practitioner_lookups_succeeded: practitionerDiagnostics.succeeded,
      practitioner_lookups_failed: practitionerDiagnostics.failed,
    });

    return {
      date,
      timezone,
      generatedAt: new Date().toISOString(),
      rooms,
      reservations,
    };
  }
}

async function loadAreas(spaceDomain: string, diagnostics?: ScheduleLoadDiagnostics) {
  return collectPages<ArchieArea>(async (startAfter) => {
    const path = conferenceRoomsPath(spaceDomain, startAfter);
    const areaResponse = await archieFetch(path);
    diagnosticLog(diagnostics, {
      stage: "room/resource lookup",
      endpoint_path: path.split("?")[0],
      query_parameter_names: path.includes("?") ? Array.from(new URLSearchParams(path.split("?")[1]).keys()).sort() : [],
      http_status: areaResponse.status,
    });
    if (!areaResponse.ok) throw new Error(`Archie areas request failed: ${areaResponse.status}`);
    const areas = conferenceRoomsResponseSchema.safeParse(await areaResponse.json());
    if (!areas.success) throw new ArchieSchemaChangedError("Archie area schema changed");
    return {
      data: getConferenceRoomsFromResponse(areas.data),
      ...getConferenceRoomsPagination(areas.data),
    };
  });
}

export function buildNormalizedReservations(
  bookings: ArchieBooking[],
  configuredRoomIds: Set<string>,
  practitionerIdentities = new Map<string, PractitionerIdentity>(),
  diagnostics?: ScheduleLoadDiagnostics,
): RoomReservation[] {
  return bookings
    .map((booking, index) => normalizeBooking(booking, practitionerDisplayNameForBooking(booking, practitionerIdentities), diagnostics, index))
    .filter((reservation): reservation is RoomReservation => Boolean(reservation))
    .filter((reservation) => configuredRoomIds.has(reservation.roomId));
}

export function normalizeBooking(
  booking: ArchieBooking,
  practitionerDisplayName = "Reserved",
  diagnostics?: ScheduleLoadDiagnostics,
  index?: number,
): RoomReservation | null {
  const mappedStatus = mapArchieReservationStatus(booking);
  if (mappedStatus === "ignored") return null;
  const id = booking.uuid || booking.booking_key;
  if (!id) {
    skippedBookingDiagnostic(diagnostics, index, "missing_identifier");
    return null;
  }

  const roomId = booking.conference_room?.uuid || booking.item_uuid || booking.conference_room?.slug;
  if (!roomId) {
    skippedBookingDiagnostic(diagnostics, index, "missing_room_reference");
    return null;
  }
  if (!booking.start_date || !booking.end_date) {
    skippedBookingDiagnostic(diagnostics, index, "missing_time_range");
    return null;
  }

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    skippedBookingDiagnostic(diagnostics, index, "invalid_time_range");
    return null;
  }

  const displayName = approvalDecision(booking.approval_status) === "confirmed" ? practitionerDisplayName : "Reserved";
  return {
    id: publicBookingId(id),
    roomId,
    start: start.toISOString(),
    end: end.toISOString(),
    practitionerDisplayName: displayName,
    status: mappedStatus,
  };
}

function publicBookingId(id: string) {
  return `booking-${createHash("sha256").update(id).digest("hex").slice(0, 16)}`;
}

function skippedBookingDiagnostic(diagnostics: ScheduleLoadDiagnostics | undefined, index: number | undefined, reason: string) {
  diagnosticLog(diagnostics, {
    stage: "final normalization",
    skipped_booking: true,
    booking_index: index,
    reason,
  });
}
