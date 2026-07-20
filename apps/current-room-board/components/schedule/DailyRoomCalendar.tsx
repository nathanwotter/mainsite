"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { scheduleDisplayConfig } from "@/config/schedule";
import { currentMinuteOffset, displayWindow, formatDisplayEndTime, formatTime, isTodayInZone, minutesBetween } from "@/lib/schedule/dateRange";
import { getAvailabilityIntervals } from "@/lib/schedule/availability";
import { layoutReservationLanes } from "@/lib/schedule/collisions";
import { getReservationPosition } from "@/lib/schedule/positioning";
import type { DailyRoomSchedule, RoomReservation } from "@/lib/schedule/types";

export function DailyRoomCalendar({ schedule }: { schedule: DailyRoomSchedule }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userMoved, setUserMoved] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const totalMinutes = (scheduleDisplayConfig.endHour - scheduleDisplayConfig.startHour) * 60;
  const height = totalMinutes * scheduleDisplayConfig.pixelsPerMinute;
  const window = displayWindow(schedule.date, schedule.timezone, scheduleDisplayConfig.startHour, scheduleDisplayConfig.endHour);
  const availability = useMemo(
    () => getAvailabilityIntervals(
      schedule.rooms,
      schedule.reservations,
      schedule.date,
      schedule.timezone,
      scheduleDisplayConfig.startHour,
      scheduleDisplayConfig.endHour,
    ),
    [schedule],
  );

  useEffect(() => {
    if (!scrollRef.current || userMoved || !isTodayInZone(schedule.date, schedule.timezone)) return;
    const offset = Math.max(0, (currentMinuteOffset(schedule.date, schedule.timezone, scheduleDisplayConfig.startHour) - 45) * scheduleDisplayConfig.pixelsPerMinute);
    scrollRef.current.scrollTop = offset;
  }, [schedule.date, schedule.timezone, userMoved]);

  const hourLines: ReactNode[] = [];
  for (let minute = 0; minute <= totalMinutes; minute += scheduleDisplayConfig.minorGridIntervalMinutes) {
    const isHour = minute % scheduleDisplayConfig.timeLabelIntervalMinutes === 0;
    hourLines.push(
      <div
        key={minute}
        className={isHour ? "grid-line hour-line" : "grid-line minor-line"}
        style={{ top: minute * scheduleDisplayConfig.pixelsPerMinute }}
      />,
    );
  }

  return (
    <section
      className="calendar-wrap"
      aria-label="Room availability calendar"
      onScroll={(event) => setHorizontalOffset(event.currentTarget.scrollLeft)}
    >
      <div
        className="room-header-row"
        style={{
          gridTemplateColumns: `86px repeat(${schedule.rooms.length}, minmax(176px, 1fr))`,
          minWidth: `calc(86px + ${schedule.rooms.length} * 176px)`,
        }}
      >
        <div className="time-corner" style={{ transform: `translateX(${horizontalOffset}px)` }} />
        {schedule.rooms.map((room) => <div className="room-heading" key={room.id}>{room.name}</div>)}
      </div>
      <div
        className="calendar-scroll"
        ref={scrollRef}
        onScroll={() => setUserMoved(true)}
        style={{ minWidth: `calc(86px + ${schedule.rooms.length} * 176px)` }}
      >
        <div className="time-gutter" style={{ height, transform: `translateX(${horizontalOffset}px)` }}>
          {Array.from({ length: scheduleDisplayConfig.endHour - scheduleDisplayConfig.startHour + 1 }, (_, index) => {
            const hour = scheduleDisplayConfig.startHour + index;
            const iso = new Date(window.start.getTime() + index * 60 * 60000).toISOString();
            return <span key={hour} style={{ top: index * 60 * scheduleDisplayConfig.pixelsPerMinute }}>{formatTime(iso, schedule.timezone)}</span>;
          })}
        </div>
        <div className="rooms-grid" style={{ height, gridTemplateColumns: `repeat(${schedule.rooms.length}, minmax(176px, 1fr))` }}>
          {schedule.rooms.map((room) => (
            <RoomColumn
              key={room.id}
              roomId={room.id}
              date={schedule.date}
              timezone={schedule.timezone}
              reservations={schedule.reservations.filter((reservation) => reservation.roomId === room.id)}
              availability={availability.filter((interval) => interval.roomId === room.id)}
              height={height}
              gridLines={hourLines}
            />
          ))}
          {isTodayInZone(schedule.date, schedule.timezone) && (
            <div
              className="current-time-line"
              style={{ top: currentMinuteOffset(schedule.date, schedule.timezone, scheduleDisplayConfig.startHour) * scheduleDisplayConfig.pixelsPerMinute }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function RoomColumn({
  roomId,
  date,
  timezone,
  reservations,
  availability,
  height,
  gridLines,
}: {
  roomId: string;
  date: string;
  timezone: string;
  reservations: RoomReservation[];
  availability: Array<{ start: string; end: string }>;
  height: number;
  gridLines: React.ReactNode[];
}) {
  const laneMap = new Map(layoutReservationLanes(reservations).map((layout) => [layout.reservationId, layout]));
  return (
    <div className="room-column" data-room-id={roomId} style={{ height }}>
      {gridLines}
      {availability.map((interval) => {
        const duration = minutesBetween(interval.start, interval.end);
        if (duration < 75) return null;
        const positioned = getReservationPosition({ id: `${interval.start}-${interval.end}`, roomId, start: interval.start, end: interval.end, practitionerDisplayName: "Available", status: "reserved" }, date, timezone);
        if (!positioned) return null;
        return <span key={`${interval.start}-${interval.end}`} className="sr-only">Open {formatTime(interval.start, timezone)} to {formatDisplayEndTime(interval.end, timezone)}</span>;
      })}
      {reservations.map((reservation) => {
        const lane = laneMap.get(reservation.id);
        const positioned = getReservationPosition(reservation, date, timezone, lane?.lane ?? 0, lane?.laneCount ?? 1);
        if (!positioned) return null;
        const width = `calc(${100 / positioned.laneCount}% - 8px)`;
        const left = `calc(${(positioned.lane * 100) / positioned.laneCount}% + 4px)`;
        return (
          <article
            className={`reservation-block ${reservation.status} ${positioned.laneCount > 1 ? "overlap" : ""}`}
            key={reservation.id}
            aria-label={`${reservation.practitionerDisplayName}, ${formatTime(reservation.start, timezone)} to ${formatDisplayEndTime(reservation.end, timezone)}`}
            style={{ top: positioned.top, height: positioned.height, left, width }}
          >
            <strong>{reservation.practitionerDisplayName}</strong>
            <span>{formatTime(reservation.start, timezone)} - {formatDisplayEndTime(reservation.end, timezone)}</span>
            {positioned.laneCount > 1 ? <em>Overlap</em> : null}
          </article>
        );
      })}
    </div>
  );
}
