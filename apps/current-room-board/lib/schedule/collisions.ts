import type { RoomReservation } from "@/lib/schedule/types";

export interface CollisionLayout {
  reservationId: string;
  lane: number;
  laneCount: number;
  overlaps: boolean;
}

export function layoutReservationLanes(reservations: RoomReservation[]): CollisionLayout[] {
  const sorted = [...reservations].sort((a, b) => {
    const byStart = new Date(a.start).getTime() - new Date(b.start).getTime();
    return byStart || new Date(a.end).getTime() - new Date(b.end).getTime() || a.id.localeCompare(b.id);
  });
  const results = new Map<string, CollisionLayout>();
  let active: Array<{ id: string; end: number; lane: number }> = [];

  for (const reservation of sorted) {
    const start = new Date(reservation.start).getTime();
    const end = new Date(reservation.end).getTime();
    active = active.filter((item) => item.end > start);
    const used = new Set(active.map((item) => item.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    active.push({ id: reservation.id, end, lane });
    const laneCount = Math.max(...active.map((item) => item.lane)) + 1;

    for (const item of active) {
      results.set(item.id, {
        reservationId: item.id,
        lane: item.lane,
        laneCount,
        overlaps: laneCount > 1,
      });
    }
  }

  return sorted.map((reservation) => results.get(reservation.id) ?? {
    reservationId: reservation.id,
    lane: 0,
    laneCount: 1,
    overlaps: false,
  });
}

export function hasRoomOverlaps(reservations: RoomReservation[]) {
  return reservations.some((reservation, index) => {
    return reservations.some((other, otherIndex) => {
      if (index === otherIndex || reservation.roomId !== other.roomId) return false;
      return new Date(reservation.start) < new Date(other.end) && new Date(reservation.end) > new Date(other.start);
    });
  });
}
