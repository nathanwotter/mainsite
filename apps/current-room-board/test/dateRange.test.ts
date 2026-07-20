import { describe, expect, it } from "vitest";
import { displayWindow, formatDisplayEndTime, parseScheduleDate } from "@/lib/schedule/dateRange";

describe("date handling", () => {
  it("builds a New York local-day UTC range", () => {
    const range = parseScheduleDate("2026-07-18", "America/New_York");
    expect(range?.startUtc.toISOString()).toBe("2026-07-18T04:00:00.000Z");
    expect(range?.endUtc.toISOString()).toBe("2026-07-19T04:00:00.000Z");
  });

  it("handles daylight saving boundaries", () => {
    const range = parseScheduleDate("2026-03-08", "America/New_York");
    expect(range?.startUtc.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(range?.endUtc.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("handles the DST fall-back local day", () => {
    const range = parseScheduleDate("2026-11-01", "America/New_York");
    expect(range?.startUtc.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(range?.endUtc.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("recognizes a booking crossing local midnight as overlapping the day", () => {
    const range = parseScheduleDate("2026-07-18", "America/New_York");
    const bookingStart = new Date("2026-07-19T03:30:00.000Z");
    const bookingEnd = new Date("2026-07-19T04:30:00.000Z");
    expect(range && bookingStart < range.endUtc && bookingEnd > range.startUtc).toBe(true);
  });

  it("creates display hours without changing the calendar day", () => {
    const window = displayWindow("2026-07-18", "America/New_York", 7, 21);
    expect(window.start.toISOString()).toBe("2026-07-18T11:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-07-19T01:00:00.000Z");
  });

  it("rounds inclusive-looking Archie end times up for display only", () => {
    expect(formatDisplayEndTime("2026-07-18T16:29:00.000Z", "America/New_York")).toBe("12:30 PM");
    expect(formatDisplayEndTime("2026-07-18T22:59:00.000Z", "America/New_York")).toBe("7:00 PM");
    expect(formatDisplayEndTime("2026-07-18T23:59:00.000Z", "America/New_York")).toBe("8:00 PM");
  });

  it("leaves exact quarter-hour end times unchanged for display", () => {
    expect(formatDisplayEndTime("2026-07-18T18:30:00.000Z", "America/New_York")).toBe("2:30 PM");
  });

  it("rounds display end times across noon", () => {
    expect(formatDisplayEndTime("2026-07-18T15:59:00.000Z", "America/New_York")).toBe("12:00 PM");
  });

  it("rounds display end times across local midnight", () => {
    expect(formatDisplayEndTime("2026-07-19T03:59:00.000Z", "America/New_York")).toBe("12:00 AM");
  });
});
