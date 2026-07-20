export const scheduleDisplayConfig = {
  startHour: 7,
  endHour: 21,
  pixelsPerMinute: 1.2,
  timeLabelIntervalMinutes: 60,
  minorGridIntervalMinutes: 15,
  defaultRefreshSeconds: 60,
  minimumReservationHeightPx: 36,
};

export const appTimezone = process.env.ARCHIE_TIMEZONE || "America/New_York";
