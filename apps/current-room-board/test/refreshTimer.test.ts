import { describe, expect, it } from "vitest";
import {
  hasIdleThresholdElapsed,
  idleResetMs,
  refreshIntervalMs,
  shouldRefreshWhenVisible,
  shouldResetDateAfterIdle,
} from "@/lib/schedule/refreshTimer";

describe("refresh timer policy", () => {
  it("uses the configured interval in milliseconds", () => {
    expect(refreshIntervalMs(60)).toBe(60_000);
  });

  it("keeps the interval positive for invalid low values", () => {
    expect(refreshIntervalMs(0)).toBe(1_000);
    expect(refreshIntervalMs(-5)).toBe(1_000);
  });

  it("uses the configured idle reset timeout in milliseconds", () => {
    expect(idleResetMs(180)).toBe(180_000);
  });

  it("keeps the idle reset timeout positive for invalid low values", () => {
    expect(idleResetMs(0)).toBe(1_000);
    expect(idleResetMs(-5)).toBe(1_000);
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

  it("detects when the idle threshold has elapsed", () => {
    expect(hasIdleThresholdElapsed(1000, 4000, 3000)).toBe(true);
    expect(hasIdleThresholdElapsed(1000, 3999, 3000)).toBe(false);
  });

  it("resets a non-today date after the board is idle", () => {
    expect(shouldResetDateAfterIdle("2026-07-21", "2026-07-20", 1000, 181_000, 180_000)).toBe(true);
  });

  it("does not reset before the idle threshold", () => {
    expect(shouldResetDateAfterIdle("2026-07-21", "2026-07-20", 1000, 180_999, 180_000)).toBe(false);
  });

  it("does not reset when the board is already on today", () => {
    expect(shouldResetDateAfterIdle("2026-07-20", "2026-07-20", 1000, 181_000, 180_000)).toBe(false);
  });
});
