import { scheduleDisplayConfig } from "@/config/schedule";
import { displayWindow, minutesBetween } from "@/lib/schedule/dateRange";
import type { RoomReservation } from "@/lib/schedule/types";

export interface PositionedReservation extends RoomReservation {
  top: number;
  height: number;
  lane: number;
  laneCount: number;
  clippedStart: string;
  clippedEnd: string;
}

export function getReservationPosition(
  reservation: RoomReservation,
  date: string,
  timezone: string,
  lane = 0,
  laneCount = 1,
): PositionedReservation | null {
  const { start, end } = displayWindow(date, timezone, scheduleDisplayConfig.startHour, scheduleDisplayConfig.endHour);
  const reservationStart = new Date(reservation.start);
  const reservationEnd = new Date(reservation.end);
  const clippedStart = new Date(Math.max(reservationStart.getTime(), start.getTime()));
  const clippedEnd = new Date(Math.min(reservationEnd.getTime(), end.getTime()));

  if (clippedEnd <= start || clippedStart >= end || clippedEnd <= clippedStart) return null;

  const top = minutesBetween(start, clippedStart) * scheduleDisplayConfig.pixelsPerMinute;
  const rawHeight = minutesBetween(clippedStart, clippedEnd) * scheduleDisplayConfig.pixelsPerMinute;
  const height = Math.max(rawHeight, scheduleDisplayConfig.minimumReservationHeightPx);

  return {
    ...reservation,
    top,
    height,
    lane,
    laneCount,
    clippedStart: clippedStart.toISOString(),
    clippedEnd: clippedEnd.toISOString(),
  };
}
