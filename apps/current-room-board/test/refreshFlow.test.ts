import { describe, expect, it } from "vitest";
import {
  failedRefreshState,
  isAbortLike,
  persistScheduleLocally,
  successfulRefreshState,
} from "@/lib/schedule/refreshFlow";
import type { DailyRoomSchedule } from "@/lib/schedule/types";

const schedule = {
  date: "2026-07-19",
  timezone: "America/New_York",
  generatedAt: "2026-07-19T13:00:00.000Z",
  rooms: [{ id: "room-a", name: "Basin", sortOrder: 1 }],
  reservations: [{
    id: "booking-a",
    roomId: "room-a",
    start: "2026-07-19T14:00:00.000Z",
    end: "2026-07-19T15:00:00.000Z",
    practitionerDisplayName: "Practitioner One",
    status: "reserved",
  }],
} satisfies DailyRoomSchedule;

const laterSchedule = {
  ...schedule,
  generatedAt: "2026-07-19T13:05:00.000Z",
} satisfies DailyRoomSchedule;

describe("schedule refresh state", () => {
  it("treats a successful primary fetch as a successful refresh", () => {
    const state = successfulRefreshState({ schedule, responseCacheHeader: "MISS" });
    expect(state.status).toBe("fresh");
    expect(state.displayedDataSource).toBe("live");
    expect(state.lastSuccessfulUpdate).toBe(schedule.generatedAt);
    expect(state.updatedTimestamp).toBe(schedule.generatedAt);
  });

  it("does not convert a successful primary fetch into a failed refresh when cache write fails", () => {
    const state = successfulRefreshState({ schedule, responseCacheHeader: "MISS" });
    expect(() => persistScheduleLocally({
      setItem() {
        throw new Error("quota exceeded");
      },
    }, "schedule", "updated", schedule, state.updatedTimestamp)).toThrow("quota exceeded");
    expect(state.status).toBe("fresh");
    expect(state.updatedTimestamp).toBe(schedule.generatedAt);
  });

  it("clears a prior failed refresh after the next primary fetch succeeds", () => {
    const failed = failedRefreshState({
      existingSchedule: schedule,
      storedSchedule: null,
      online: true,
    });
    expect(failed.status).toBe("stale");

    const recovered = successfulRefreshState({ schedule: laterSchedule, responseCacheHeader: "MISS" });
    expect(recovered.status).toBe("fresh");
    expect(recovered.updatedTimestamp).toBe(laterSchedule.generatedAt);
  });

  it("does not turn an aborted overlapping refresh into a failed refresh", () => {
    expect(isAbortLike(new DOMException("superseded", "AbortError"))).toBe(true);
    expect(isAbortLike(new Error("network failed"))).toBe(false);
  });

  it("shows the failure banner only when cached schedule data is displayed after primary fetch failure", () => {
    const state = failedRefreshState({
      existingSchedule: null,
      storedSchedule: { schedule, updatedAt: schedule.generatedAt },
      online: true,
    });

    expect(state.status).toBe("stale");
    expect(state.displayedDataSource).toBe("local-cache");
    expect(state.showFailureBanner).toBe(true);
    expect(state.updatedTimestamp).toBe(schedule.generatedAt);
  });

  it("does not show a stale banner when primary fetch fails and no schedule can be displayed", () => {
    const state = failedRefreshState({
      existingSchedule: null,
      storedSchedule: null,
      online: true,
    });

    expect(state.status).toBe("loading");
    expect(state.showFailureBanner).toBe(false);
  });
});
