import { describe, expect, it } from "vitest";
import { layoutReservationLanes } from "@/lib/schedule/collisions";
import type { RoomReservation } from "@/lib/schedule/types";

const base = { roomId: "room-a", practitionerDisplayName: "Reserved", status: "reserved" as const };

describe("collision layout", () => {
  it("keeps adjacent reservations in one lane", () => {
    const lanes = layoutReservationLanes([
      { ...base, id: "a", start: "2026-07-18T13:00:00Z", end: "2026-07-18T14:00:00Z" },
      { ...base, id: "b", start: "2026-07-18T14:00:00Z", end: "2026-07-18T15:00:00Z" },
    ]);
    expect(lanes.every((lane) => lane.laneCount === 1)).toBe(true);
  });

  it("places three nested overlaps in deterministic lanes", () => {
    const lanes = layoutReservationLanes([
      { ...base, id: "a", start: "2026-07-18T13:00:00Z", end: "2026-07-18T16:00:00Z" },
      { ...base, id: "b", start: "2026-07-18T14:00:00Z", end: "2026-07-18T15:00:00Z" },
      { ...base, id: "c", start: "2026-07-18T14:30:00Z", end: "2026-07-18T15:30:00Z" },
    ]);
    expect(lanes.map((lane) => [lane.reservationId, lane.lane, lane.laneCount])).toEqual([
      ["a", 0, 3],
      ["b", 1, 3],
      ["c", 2, 3],
    ]);
  });
});
