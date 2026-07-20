export function refreshIntervalMs(refreshSeconds: number) {
  return Math.max(1, refreshSeconds) * 1000;
}

export function shouldRefreshWhenVisible(lastSuccessfulUpdate: string | null, nowMs: number, maxAgeMs: number) {
  if (!lastSuccessfulUpdate) return true;
  const updatedAt = new Date(lastSuccessfulUpdate).getTime();
  if (!Number.isFinite(updatedAt)) return true;
  return nowMs - updatedAt >= maxAgeMs;
}
