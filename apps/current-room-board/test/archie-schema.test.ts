import { describe, expect, it } from "vitest";
import { buildNormalizedReservations, normalizeBooking } from "@/lib/archie/adapter";
import { paginatedBookingsSchema, type ArchieBooking } from "@/lib/archie/schemas";
import { approvalDecision, mapArchieReservationStatus } from "@/lib/archie/types";

const baseBooking = {
  uuid: "booking-1",
  item_uuid: "room-a",
  start_date: "2026-07-18T13:00:00.000Z",
  end_date: "2026-07-18T14:00:00.000Z",
  cancelled: false,
  approval_status: "approved",
  subscriber_uuid: "practitioner-amy-placeholder",
  beneficiary_type: "user",
  user_beneficiary: {
    uuid: "beneficiary-practitioner",
    fullname: "Sensitive Beneficiary Person",
    email: "beneficiary@example.com",
  },
  responsible: {
    uuid: "staff-creator",
    fullname: "Sensitive Staff Creator",
    email: "responsible@example.com",
  },
  name: "Sensitive Booking Title",
  description: "Sensitive customer description",
  note: "Sensitive private note",
} satisfies ArchieBooking;

describe("Archie booking schema and normalization", () => {
  it("rejects malformed top-level Archie booking responses", () => {
    const result = paginatedBookingsSchema.safeParse({ data: { uuid: "booking-1" } });
    expect(result.success).toBe(false);
  });

  it("keeps missing approval_status as occupied Reserved instead of rejecting the response", () => {
    const result = paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, approval_status: undefined }] });
    expect(result.success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, approval_status: undefined }, "Current Practitioner")).toMatchObject({
      practitionerDisplayName: "Reserved",
      status: "reserved",
    });
  });

  it("keeps null approval_status as occupied Reserved instead of rejecting the response", () => {
    const result = paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, approval_status: null }] });
    expect(result.success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, approval_status: null }, "Current Practitioner")).toMatchObject({
      practitionerDisplayName: "Reserved",
      status: "reserved",
    });
  });

  it("keeps unrecognized approval_status as occupied Reserved instead of rejecting the response", () => {
    const result = paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, approval_status: "confirmed" }] });
    expect(result.success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, approval_status: "" }, "Current Practitioner")).toMatchObject({
      practitionerDisplayName: "Reserved",
      status: "reserved",
    });
    expect(normalizeBooking({ ...baseBooking, approval_status: "unexpected-live-value" }, "Current Practitioner")).toMatchObject({
      practitionerDisplayName: "Reserved",
      status: "reserved",
    });
  });

  it("accepts confirmed approval_status as a confirmed booking", () => {
    expect(approvalDecision("approved")).toBe("confirmed");
    expect(approvalDecision("confirmed")).toBe("confirmed");
    expect(normalizeBooking({ ...baseBooking, approval_status: "confirmed" }, "Current Practitioner")).toMatchObject({
      practitionerDisplayName: "Current Practitioner",
      status: "reserved",
    });
  });

  it("skips a booking with a missing stable booking identifier", () => {
    const result = paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, uuid: undefined, booking_key: undefined }] });
    expect(result.success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, uuid: undefined, booking_key: undefined })).toBeNull();
  });

  it("skips a booking with a missing room reference", () => {
    const result = paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, item_uuid: undefined, conference_room: undefined }] });
    expect(result.success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, item_uuid: undefined, conference_room: undefined })).toBeNull();
  });

  it("skips a booking with a missing or invalid time range", () => {
    expect(paginatedBookingsSchema.safeParse({ data: [{ ...baseBooking, start_date: undefined }] }).success).toBe(true);
    expect(normalizeBooking({ ...baseBooking, start_date: undefined })).toBeNull();
    expect(normalizeBooking({ ...baseBooking, start_date: "not-a-date" })).toBeNull();
    expect(normalizeBooking({ ...baseBooking, end_date: baseBooking.start_date })).toBeNull();
  });

  it("ignores cancelled and declined bookings", () => {
    expect(mapArchieReservationStatus({ cancelled: true, approval_status: "approved" })).toBe("ignored");
    expect(mapArchieReservationStatus({ cancelled: false, approval_status: "declined" })).toBe("ignored");
    expect(mapArchieReservationStatus({ cancelled: false, approval_status: "rejected" })).toBe("ignored");
    expect(normalizeBooking({ ...baseBooking, cancelled: true })).toBeNull();
    expect(normalizeBooking({ ...baseBooking, approval_status: "declined" })).toBeNull();
    expect(normalizeBooking({ ...baseBooking, approval_status: "rejected" })).toBeNull();
  });

  it("maps pending bookings as blocked", () => {
    expect(mapArchieReservationStatus({ cancelled: false, approval_status: "pending" })).toBe("blocked");
    expect(normalizeBooking({ ...baseBooking, approval_status: "pending" })?.status).toBe("blocked");
  });

  it("filters room-reference mismatches against configured rooms", () => {
    const reservations = buildNormalizedReservations([{ ...baseBooking, item_uuid: "unknown-room" }], new Set(["room-a"]));
    expect(reservations).toEqual([]);
  });

  it("never exposes sensitive client or Archie text fields in normalized output", () => {
    const reservation = normalizeBooking(baseBooking);
    const serialized = JSON.stringify(reservation);
    expect(serialized).not.toContain("Sensitive");
    expect(serialized).not.toContain("example.com");
    expect(serialized).not.toContain("Booking Title");
    expect(serialized).not.toContain("private note");
    expect(reservation).toMatchObject({
      roomId: "room-a",
      start: "2026-07-18T13:00:00.000Z",
      end: "2026-07-18T14:00:00.000Z",
      practitionerDisplayName: "Reserved",
      status: "reserved",
    });
    expect(reservation?.id).toMatch(/^booking-[a-f0-9]{16}$/);
    expect(reservation?.id).not.toBe("booking-1");
  });

  it("uses only resolved beneficiary identities for practitioner display names", () => {
    const identities = new Map([
      ["user:beneficiary-practitioner", { id: "beneficiary-practitioner", displayName: "Current Practitioner Name" }],
      ["user:staff-creator", { id: "staff-creator", displayName: "Staff Should Not Win" }],
    ]);

    const reservation = buildNormalizedReservations([baseBooking], new Set(["room-a"]), identities);
    expect(reservation[0]?.practitionerDisplayName).toBe("Current Practitioner Name");
  });

  it("matches the live office-room booking shape by nested conference_room.uuid", () => {
    const reservation = buildNormalizedReservations([{
      ...baseBooking,
      item_uuid: undefined,
      conference_room: {
        uuid: "b4cc4859-8845-5d52-9669-f629affbc83c",
        slug: "Basin-1761388678",
        name: "Basin",
        category: "office",
        archived: false,
      },
    }], new Set(["b4cc4859-8845-5d52-9669-f629affbc83c"]));

    expect(reservation).toHaveLength(1);
    expect(reservation[0]?.roomId).toBe("b4cc4859-8845-5d52-9669-f629affbc83c");
  });

  it("normalizes bookings into Schooner and Pram by stable Archie UUID", () => {
    const reservations = buildNormalizedReservations([
      {
        ...baseBooking,
        uuid: "booking-schooner",
        item_uuid: undefined,
        conference_room: {
          uuid: "1e0426c4-14e7-5a9b-99b7-a899d0e2115d",
          slug: "Schooner-1761388816",
          name: "Schooner",
          category: "office",
          archived: false,
        },
      },
      {
        ...baseBooking,
        uuid: "booking-pram",
        item_uuid: undefined,
        conference_room: {
          uuid: "248d7e04-fc69-5821-ad20-9d9ebae36d0d",
          slug: "pram",
          name: "Pram",
          category: "office",
          archived: false,
        },
      },
    ], new Set([
      "1e0426c4-14e7-5a9b-99b7-a899d0e2115d",
      "248d7e04-fc69-5821-ad20-9d9ebae36d0d",
    ]));

    expect(reservations.map((reservation) => reservation.roomId)).toEqual([
      "1e0426c4-14e7-5a9b-99b7-a899d0e2115d",
      "248d7e04-fc69-5821-ad20-9d9ebae36d0d",
    ]);
  });

  it("keeps valid bookings when another booking in the same response is malformed", () => {
    const result = paginatedBookingsSchema.safeParse({
      data: [
        { ...baseBooking, uuid: "valid-booking" },
        { ...baseBooking, uuid: "bad-booking", item_uuid: undefined, conference_room: undefined },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected schema parse to succeed");
    const reservations = buildNormalizedReservations(result.data.data, new Set(["room-a"]));
    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.roomId).toBe("room-a");
  });
});
