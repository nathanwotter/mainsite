export function refreshIntervalMs(refreshSeconds: number) {
  return Math.max(1, refreshSeconds) * 1000;
}

export function idleResetMs(idleResetSeconds: number) {
  return Math.max(1, idleResetSeconds) * 1000;
}

export function shouldRefreshWhenVisible(lastSuccessfulUpdate: string | null, nowMs: number, maxAgeMs: number) {
  if (!lastSuccessfulUpdate) return true;
  const updatedAt = new Date(lastSuccessfulUpdate).getTime();
  if (!Number.isFinite(updatedAt)) return true;
  return nowMs - updatedAt >= maxAgeMs;
}

export function hasIdleThresholdElapsed(lastActivityMs: number, nowMs: number, thresholdMs: number) {
  return nowMs - lastActivityMs >= thresholdMs;
}

export function shouldResetDateAfterIdle(displayedDate: string, todayDate: string, lastActivityMs: number, nowMs: number, thresholdMs: number) {
  return displayedDate !== todayDate && hasIdleThresholdElapsed(lastActivityMs, nowMs, thresholdMs);
}
