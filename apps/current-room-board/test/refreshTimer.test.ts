import { describe, expect, it } from "vitest";
import { refreshIntervalMs, shouldRefreshWhenVisible } from "@/lib/schedule/refreshTimer";

describe("refresh timer policy", () => {
  it("uses the configured interval in milliseconds", () => {
    expect(refreshIntervalMs(60)).toBe(60_000);
  });

  it("keeps the interval positive for invalid low values", () => {
    expect(refreshIntervalMs(0)).toBe(1_000);
    expect(refreshIntervalMs(-5)).toBe(1_000);
  });

  it("refreshes on foreground when there is no successful update", () => {
    expect(shouldRefreshWhenVisible(null, Date.parse("2026-07-20T15:00:00.000Z"), 60_000)).toBe(true);
  });

  it("refreshes on foreground when displayed data is at least one interval old", () => {
    expect(shouldRefreshWhenVisible(
      "2026-07-20T14:59:00.000Z",
      Date.parse("2026-07-20T15:00:00.000Z"),
      60_000,
    )).toBe(true);
  });

  it("does not refresh on foreground when displayed data is still recent", () => {
    expect(shouldRefreshWhenVisible(
      "2026-07-20T14:59:30.000Z",
      Date.parse("2026-07-20T15:00:00.000Z"),
      60_000,
    )).toBe(false);
  });
});
