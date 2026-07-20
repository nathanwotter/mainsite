import { describe, expect, it } from "vitest";
import { getReservationPosition } from "@/lib/schedule/positioning";

describe("visual positioning", () => {
  it("positions a 9:15 booking below the 9:00 line", () => {
    const positioned = getReservationPosition({
      id: "a",
      roomId: "room-a",
      start: "2026-07-18T13:15:00.000Z",
      end: "2026-07-18T14:45:00.000Z",
      practitionerDisplayName: "Amy",
      status: "reserved",
    }, "2026-07-18", "America/New_York");
    expect(positioned?.top).toBe(162);
    expect(positioned?.height).toBe(108);
  });

  it("clips reservations at the visible boundary", () => {
    const positioned = getReservationPosition({
      id: "early",
      roomId: "room-a",
      start: "2026-07-18T10:00:00.000Z",
      end: "2026-07-18T12:00:00.000Z",
      practitionerDisplayName: "Reserved",
      status: "reserved",
    }, "2026-07-18", "America/New_York");
    expect(positioned?.top).toBe(0);
    expect(positioned?.height).toBe(72);
  });
});
