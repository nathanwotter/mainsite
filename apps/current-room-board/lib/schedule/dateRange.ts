import { addDays, isValid, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseScheduleDate(value: string | null, timezone: string) {
  const requested = value || formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  if (!datePattern.test(requested)) return null;

  const localStart = parseISO(`${requested}T00:00:00`);
  if (!isValid(localStart) || formatInTimeZone(fromZonedTime(localStart, timezone), timezone, "yyyy-MM-dd") !== requested) {
    return null;
  }

  const localEnd = addDays(localStart, 1);
  return {
    date: requested,
    timezone,
    startUtc: fromZonedTime(localStart, timezone),
    endUtc: fromZonedTime(localEnd, timezone),
    displayStartUtc: fromZonedTime(localStart, timezone),
  };
}

export function displayWindow(date: string, timezone: string, startHour: number, endHour: number) {
  const start = parseISO(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
  const end = parseISO(`${date}T${String(endHour).padStart(2, "0")}:00:00`);

  return {
    start: fromZonedTime(start, timezone),
    end: fromZonedTime(end, timezone),
  };
}

export function minutesBetween(start: string | Date, end: string | Date) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

export function formatTime(iso: string, timezone: string) {
  return formatInTimeZone(iso, timezone, "h:mm a");
}

export function formatDisplayEndTime(iso: string, timezone: string) {
  return formatTime(roundDisplayEndTime(iso, timezone).toISOString(), timezone);
}

// Archie end timestamps can look inclusive to users, so only the displayed end label rounds up.
export function roundDisplayEndTime(iso: string, timezone: string) {
  const localEnd = toZonedTime(iso, timezone);
  const minute = localEnd.getMinutes();
  const onExactQuarterHour = minute % 15 === 0 && localEnd.getSeconds() === 0 && localEnd.getMilliseconds() === 0;

  if (onExactQuarterHour) {
    return new Date(iso);
  }

  const minutesToAdd = minute % 15 === 0 ? 15 : 15 - (minute % 15);
  const roundedLocalEnd = new Date(localEnd);
  roundedLocalEnd.setMinutes(minute + minutesToAdd, 0, 0);
  return fromZonedTime(roundedLocalEnd, timezone);
}

export function isTodayInZone(date: string, timezone: string) {
  return date === formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export function currentMinuteOffset(date: string, timezone: string, startHour: number) {
  const nowLocal = toZonedTime(new Date(), timezone);
  const dayStart = parseISO(`${date}T${String(startHour).padStart(2, "0")}:00:00`);
  return minutesBetween(dayStart, nowLocal);
}
