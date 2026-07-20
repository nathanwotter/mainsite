import { displayWindow } from "@/lib/schedule/dateRange";
import type { AvailabilityInterval, Room, RoomReservation } from "@/lib/schedule/types";

export function getAvailabilityIntervals(
  rooms: Room[],
  reservations: RoomReservation[],
  date: string,
  timezone: string,
  startHour: number,
  endHour: number,
): AvailabilityInterval[] {
  const window = displayWindow(date, timezone, startHour, endHour);

  return rooms.flatMap((room) => {
    const intervals = reservations
      .filter((reservation) => reservation.roomId === room.id)
      .map((reservation) => ({
        start: new Date(Math.max(new Date(reservation.start).getTime(), window.start.getTime())),
        end: new Date(Math.min(new Date(reservation.end).getTime(), window.end.getTime())),
      }))
      .filter((interval) => interval.end > interval.start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: Array<{ start: Date; end: Date }> = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (previous && interval.start <= previous.end) {
        previous.end = new Date(Math.max(previous.end.getTime(), interval.end.getTime()));
      } else {
        merged.push({ ...interval });
      }
    }

    const available: AvailabilityInterval[] = [];
    let cursor = window.start;
    for (const busy of merged) {
      if (busy.start > cursor) {
        available.push({ roomId: room.id, start: cursor.toISOString(), end: busy.start.toISOString() });
      }
      if (busy.end > cursor) cursor = busy.end;
    }
    if (cursor < window.end) {
      available.push({ roomId: room.id, start: cursor.toISOString(), end: window.end.toISOString() });
    }
    return available;
  });
}
