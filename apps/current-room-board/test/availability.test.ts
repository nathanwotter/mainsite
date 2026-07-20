import { describe, expect, it } from "vitest";
import { getAvailabilityIntervals } from "@/lib/schedule/availability";
import type { Room, RoomReservation } from "@/lib/schedule/types";

const rooms: Room[] = [{ id: "room-a", name: "Room A", sortOrder: 1 }];

describe("availability", () => {
  it("returns the full window for an empty room", () => {
    const intervals = getAvailabilityIntervals(rooms, [], "2026-07-18", "America/New_York", 7, 9);
    expect(intervals).toHaveLength(1);
  });

  it("handles back-to-back and overlapping reservations", () => {
    const reservations: RoomReservation[] = [
      { id: "a", roomId: "room-a", start: "2026-07-18T12:00:00.000Z", end: "2026-07-18T13:00:00.000Z", practitionerDisplayName: "Amy", status: "reserved" },
      { id: "b", roomId: "room-a", start: "2026-07-18T13:00:00.000Z", end: "2026-07-18T14:00:00.000Z", practitionerDisplayName: "Sam", status: "reserved" },
      { id: "c", roomId: "room-a", start: "2026-07-18T13:30:00.000Z", end: "2026-07-18T14:30:00.000Z", practitionerDisplayName: "Lee", status: "reserved" },
    ];
    const intervals = getAvailabilityIntervals(rooms, reservations, "2026-07-18", "America/New_York", 7, 12);
    expect(intervals.map((interval) => [interval.start, interval.end])).toEqual([
      ["2026-07-18T11:00:00.000Z", "2026-07-18T12:00:00.000Z"],
      ["2026-07-18T14:30:00.000Z", "2026-07-18T16:00:00.000Z"],
    ]);
  });
});
