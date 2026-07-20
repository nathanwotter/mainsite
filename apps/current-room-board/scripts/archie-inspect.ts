import { archieFetch } from "../lib/archie/client";
import { createRequire } from "node:module";
import { conferenceRoomsPath, getArchieSpaceDomain, unfilteredConferenceRoomsPath } from "../lib/archie/areas";
import { createHash } from "node:crypto";
import {
  archieErrorResponseSchema,
  conferenceRoomsResponseSchema,
  getConferenceRoomsFromResponse,
  getConferenceRoomsPagination,
  paginatedBookingsSchema,
  type ArchieArea,
  type ArchieBooking,
} from "../lib/archie/schemas";
import { collectPages } from "../lib/archie/pagination";
import {
  practitionerDisplayNameForBooking,
  practitionerLookupSucceededForBooking,
  practitionerSourceFieldForBooking,
  resolvePractitionerIdentities,
  type PractitionerIdentity,
} from "../lib/archie/practitioners";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

function nestedObject(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function firstPresent(record: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const parts = path.split(".");
    let cursor: unknown = record;
    for (const part of parts) {
      cursor = cursor && typeof cursor === "object" ? (cursor as Record<string, unknown>)[part] : undefined;
    }
    if (typeof cursor === "string" && cursor.trim()) return path;
  }
  return null;
}

function fieldPresence(record: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, record[field] !== undefined && record[field] !== null]));
}

function publicHash(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function spaceSummary(space: Record<string, unknown>) {
  return {
    uuid: space.uuid,
    domain: space.domain,
    time_zone: space.time_zone,
  };
}

function areaSummary(area: Record<string, unknown>) {
  return {
    uuid: area.uuid,
    slug: area.slug,
    name: area.name,
    category: area.category,
    archived: area.archived,
  };
}

function jsonType(value: unknown) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function structuralDiagnostics(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const collectionFields = record
    ? Object.entries(record)
      .filter(([, fieldValue]) => Array.isArray(fieldValue))
      .map(([field]) => field)
    : Array.isArray(value) ? ["<top-level-array>"] : [];
  const paginationFields = record
    ? ["has_more", "next_token", "request_uuid", "total_count", "limit", "startAfter"]
      .filter((field) => field in record)
    : [];

  return {
    top_level_json_type: jsonType(value),
    top_level_field_names: record ? Object.keys(record).sort() : [],
    collection_fields: {
      data: Boolean(record && Array.isArray(record.data)),
      items: Boolean(record && Array.isArray(record.items)),
      results: Boolean(record && Array.isArray(record.results)),
      other: collectionFields.filter((field) => !["data", "items", "results", "<top-level-array>"].includes(field)),
      top_level_array: Array.isArray(value),
    },
    pagination_fields: paginationFields,
  };
}

function sanitizedText(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(access_token|refresh_token|client_secret)\b\s*[:=]\s*[A-Za-z0-9._~+/=-]+/gi, "$1=[redacted]")
    .slice(0, 300);
}

function safeErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object" || Array.isArray(error)) return undefined;
  return sanitizedText((error as Record<string, unknown>)[field]);
}

function relevantHeaderNames(headers: Headers) {
  return Array.from(headers.keys())
    .filter((name) => (
      name === "content-type" ||
      name === "retry-after" ||
      name === "x-request-id" ||
      name === "x-correlation-id" ||
      name.startsWith("x-ratelimit")
    ))
    .sort();
}

function requestDiagnostics(response: Response, body: unknown, requestPath: string) {
  const record = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const parsedError = archieErrorResponseSchema.safeParse(body);
  const error = parsedError.success ? parsedError.data.error : record.error;
  const url = new URL(requestPath, "https://api.archieapp.co/v1");

  return {
    http_status: response.status,
    error_type: safeErrorField(error, "type"),
    error_code: safeErrorField(error, "code") || safeErrorField(error, "message_code"),
    error_message: typeof error === "string" ? sanitizedText(error) : safeErrorField(error, "message"),
    request_uuid: typeof record.request_uuid === "string" ? record.request_uuid : undefined,
    request_path: url.pathname,
    query_parameter_names: Array.from(new Set(url.searchParams.keys())).sort(),
    response_header_names: relevantHeaderNames(response.headers),
  };
}

async function fetchConferenceRoomsPath(requestPath: string) {
  const response = await archieFetch(requestPath);
  const json = await response.json() as unknown;
  const structure = structuralDiagnostics(json);

  if (!response.ok) {
    const parsedError = archieErrorResponseSchema.safeParse(json);
    return {
      ok: false,
      requestPath,
      httpStatus: response.status,
      structure,
      rooms: [] as ArchieArea[],
      parsedErrorWrapper: parsedError.success,
      diagnostics: requestDiagnostics(response, json, requestPath),
    };
  }

  const parsed = conferenceRoomsResponseSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      requestPath,
      httpStatus: response.status,
      structure,
      rooms: [] as ArchieArea[],
      parsedErrorWrapper: false,
      diagnostics: requestDiagnostics(response, json, requestPath),
    };
  }

  return {
    ok: true,
    requestPath,
    httpStatus: response.status,
    structure,
    rooms: getConferenceRoomsFromResponse(parsed.data),
    parsedErrorWrapper: false,
    diagnostics: requestDiagnostics(response, json, requestPath),
    pagination: getConferenceRoomsPagination(parsed.data),
    parsed: parsed.data,
  };
}

async function loadConferenceRooms(spaceDomain: string) {
  const unfiltered = await fetchConferenceRoomsPath(unfilteredConferenceRoomsPath(spaceDomain));
  const first = unfiltered.ok ? unfiltered : await fetchConferenceRoomsPath(conferenceRoomsPath(spaceDomain));
  const firstStructure = first.structure;
  const attempts = unfiltered === first ? [unfiltered.diagnostics] : [unfiltered.diagnostics, first.diagnostics];

  if (!first.ok) return { ...first, attempts };

  const pagination = first.pagination;
  if (!pagination) {
    return { ...first, ok: false, rooms: [] as ArchieArea[], attempts };
  }
  if (!pagination.has_more) {
    return {
      ok: true,
      requestPath: first.requestPath,
      httpStatus: first.httpStatus,
      structure: firstStructure,
      rooms: first.rooms,
      parsedErrorWrapper: false,
      diagnostics: first.diagnostics,
      attempts,
    };
  }

  const rooms = await collectPages<ArchieArea>(async (startAfter) => {
    if (!startAfter) {
      return {
        data: first.rooms,
        ...pagination,
      };
    }
    const page = await fetchConferenceRoomsPath(conferenceRoomsPath(spaceDomain, startAfter));
    if (!page.ok || !("pagination" in page)) {
      return { data: [], has_more: false };
    }
    return {
      data: page.rooms,
      ...page.pagination,
    };
  });

  return {
    ok: true,
    requestPath: first.requestPath,
    httpStatus: first.httpStatus,
    structure: firstStructure,
    rooms,
    parsedErrorWrapper: false,
    diagnostics: first.diagnostics,
    attempts,
  };
}

function bookingSummary(booking: ArchieBooking, identities: Map<string, PractitionerIdentity>) {
  const record = booking as Record<string, unknown>;
  const room = nestedObject(record, "conference_room");
  const responsible = nestedObject(booking, "responsible");
  return {
    sanitized_booking_hash: publicHash(booking.uuid || booking.booking_key),
    room_fields: {
      item_uuid: Boolean(booking.item_uuid),
      conference_room_uuid: Boolean(room?.uuid),
      conference_room_slug: Boolean(room?.slug),
    },
    responsible_id_present: Boolean(responsible?.uuid || responsible?.id),
    subscriber: {
      subscriber_uuid: Boolean(booking.subscriber_uuid),
      subscriber_type: booking.subscriber_type,
    },
    beneficiary: {
      beneficiary_uuid: Boolean(booking.beneficiary_uuid),
      beneficiary_type: booking.beneficiary_type,
      user_beneficiary_present: Boolean(booking.user_beneficiary?.uuid || booking.user_beneficiary?.id),
      group_beneficiary_present: Boolean(booking.group_beneficiary?.uuid || booking.group_beneficiary?.id),
    },
    approval_status_present: booking.approval_status !== undefined,
    cancelled_present: booking.cancelled !== undefined,
    selected_room_join_field: firstPresent(booking, ["conference_room.uuid", "item_uuid", "conference_room.slug"]),
    selected_practitioner_source_field: practitionerSourceFieldForBooking(booking),
    practitioner_lookup_succeeded: practitionerLookupSucceededForBooking(booking, identities),
    resulting_safe_display_name: practitionerDisplayNameForBooking(booking, identities),
    date_fields_present: fieldPresence(booking, ["start_date", "end_date"]),
  };
}

async function main() {
  if (process.env.ALLOW_ARCHIE_INSPECTION !== "true") {
    throw new Error("Set ALLOW_ARCHIE_INSPECTION=true before running Archie inspection.");
  }

  const spaces = await archieFetch("/me/spaces");
  const spacesJson = await spaces.json() as Array<Record<string, unknown>>;
  console.log("Spaces");
  console.log(JSON.stringify(spacesJson.map(spaceSummary), null, 2));

  const spaceDomain = getArchieSpaceDomain() || String(spacesJson[0]?.domain || "");
  if (!spaceDomain) throw new Error("Set ARCHIE_SPACE_DOMAIN or ARCHIE_LOCATION_ID, or ensure /me/spaces returns a domain.");

  const areaResult = await loadConferenceRooms(spaceDomain);
  const areaRecords = areaResult.rooms;
  console.log("Area response structure");
  console.log(JSON.stringify({
    ...areaResult.structure,
    http_status: areaResult.httpStatus,
    parsed_error_wrapper: areaResult.parsedErrorWrapper,
    successful_request_path: areaResult.ok ? areaResult.requestPath : undefined,
    request_attempt_diagnostics: areaResult.attempts,
    room_record_count: areaRecords.length,
  }, null, 2));
  console.log("Areas");
  console.log(JSON.stringify(areaRecords.map((area) => areaSummary(area as Record<string, unknown>)), null, 2));

  const bookingParams = new URLSearchParams({ limit: "5", itemType: "area" });
  bookingParams.append("types[]", "booking");
  bookingParams.append("categories[]", "conference-room");
  bookingParams.append("categories[]", "office");
  const bookings = await archieFetch(`/spaces/${encodeURIComponent(spaceDomain)}/bookings?${bookingParams.toString()}`);
  const bookingsJson = await bookings.json() as unknown;
  const parsedBookings = paginatedBookingsSchema.safeParse(bookingsJson);
  const bookingRecords = parsedBookings.success ? parsedBookings.data.data : [];
  const practitionerIdentities = await resolvePractitionerIdentities(bookingRecords, spaceDomain);
  console.log("Booking field summary");
  console.log(JSON.stringify(bookingRecords.map((booking) => bookingSummary(booking, practitionerIdentities)), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Archie inspection failed");
  process.exit(1);
});
