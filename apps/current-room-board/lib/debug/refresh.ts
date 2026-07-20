export function refreshDebugEnabled() {
  return process.env.NEXT_PUBLIC_REFRESH_DEBUG === "true" || process.env.ALLOW_ARCHIE_INSPECTION === "true";
}

export function logRefreshDebug(fields: Record<string, unknown>) {
  if (!refreshDebugEnabled()) return;
  console.info(JSON.stringify({ source: "current_room_board_refresh", ...fields }));
}
