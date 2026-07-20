import type { DailyRoomSchedule } from "@/lib/schedule/types";

export type RefreshTrigger = "initial load" | "polling" | "manual refresh" | "date navigation" | "idle reset";
export type DisplayedDataSource = "live" | "local-cache";
export type RefreshStatus = "loading" | "fresh" | "stale" | "offline";

export interface StoredSchedule {
  schedule: DailyRoomSchedule;
  updatedAt: string;
}

export interface RefreshSuccessInput {
  schedule: DailyRoomSchedule;
  responseCacheHeader: string | null;
}

export interface RefreshFailureInput {
  existingSchedule: DailyRoomSchedule | null;
  storedSchedule: StoredSchedule | null;
  online: boolean;
}

export interface LocalScheduleStorage {
  setItem(key: string, value: string): void;
}

export function successfulRefreshState(input: RefreshSuccessInput) {
  return {
    schedule: input.schedule,
    status: "fresh" as RefreshStatus,
    displayedDataSource: "live" as DisplayedDataSource,
    lastSuccessfulUpdate: input.schedule.generatedAt,
    updatedTimestamp: input.schedule.generatedAt,
    responseCache: input.responseCacheHeader ?? "UNKNOWN",
  };
}

export function failedRefreshState(input: RefreshFailureInput) {
  const fallback = input.existingSchedule
    ? { schedule: input.existingSchedule, source: "live" as DisplayedDataSource }
    : input.storedSchedule
      ? { schedule: input.storedSchedule.schedule, source: "local-cache" as DisplayedDataSource }
      : null;

  if (!fallback) {
    return {
      schedule: null,
      status: "loading" as RefreshStatus,
      displayedDataSource: null,
      lastSuccessfulUpdate: null,
      updatedTimestamp: null,
      showFailureBanner: false,
    };
  }

  return {
    schedule: fallback.schedule,
    status: input.online ? "stale" as RefreshStatus : "offline" as RefreshStatus,
    displayedDataSource: "local-cache" as DisplayedDataSource,
    lastSuccessfulUpdate: fallback.schedule.generatedAt,
    updatedTimestamp: fallback.schedule.generatedAt,
    showFailureBanner: true,
  };
}

export function isAbortLike(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

export function persistScheduleLocally(
  storage: LocalScheduleStorage,
  scheduleKey: string,
  updatedKey: string,
  schedule: DailyRoomSchedule,
  updatedAt: string,
) {
  storage.setItem(scheduleKey, JSON.stringify(schedule));
  storage.setItem(updatedKey, updatedAt);
}
