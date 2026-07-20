import { getVisibleRooms } from "@/config/rooms";
import type { ArchieScheduleAdapter } from "@/lib/archie/types";
import { displayWindow } from "@/lib/schedule/dateRange";
import type { RoomReservation } from "@/lib/schedule/types";

function at(date: string, hour: number, minute = 0, timezone = "America/New_York") {
  const local = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  return new Date(`${local}${timezone === "America/New_York" ? "-04:00" : "Z"}`).toISOString();
}

export class MockArchieScheduleAdapter implements ArchieScheduleAdapter {
  async getDailySchedule(date: string, timezone: string) {
    const rooms = getVisibleRooms();
    const lastRoom = rooms[rooms.length - 1];
    const { start, end } = displayWindow(date, timezone, 7, 21);
    const reservations: RoomReservation[] = [
      { id: "mock-1", roomId: rooms[0].id, start: at(date, 8), end: at(date, 9, 30), practitionerDisplayName: "Amy", status: "reserved" },
      { id: "mock-2", roomId: rooms[0].id, start: at(date, 11), end: at(date, 11, 30), practitionerDisplayName: "Lee", status: "reserved" },
      { id: "mock-3", roomId: rooms[1].id, start: at(date, 9, 15), end: at(date, 10), practitionerDisplayName: "Sam", status: "reserved" },
      { id: "mock-4", roomId: rooms[1].id, start: at(date, 10), end: at(date, 11, 30), practitionerDisplayName: "Morgan", status: "reserved" },
      { id: "mock-5", roomId: rooms[2].id, start: at(date, 8, 15), end: at(date, 9, 45), practitionerDisplayName: "Jordan", status: "reserved" },
      { id: "mock-6", roomId: rooms[3].id, start: at(date, 9), end: at(date, 12), practitionerDisplayName: "Reserved", status: "blocked" },
      { id: "mock-7", roomId: lastRoom.id, start: start.toISOString(), end: end.toISOString(), practitionerDisplayName: "Staff Training", status: "blocked" },
      { id: "mock-8", roomId: rooms[2].id, start: at(date, 14), end: at(date, 15), practitionerDisplayName: "Amy", status: "reserved" },
      { id: "mock-9", roomId: rooms[2].id, start: at(date, 14, 30), end: at(date, 15, 30), practitionerDisplayName: "Jordan", status: "reserved" },
      { id: "mock-private-client", roomId: rooms[0].id, start: at(date, 16), end: at(date, 16, 45), practitionerDisplayName: "Reserved", status: "reserved" },
    ];

    return {
      date,
      timezone,
      generatedAt: new Date().toISOString(),
      rooms,
      reservations: reservations.sort((a, b) => a.roomId.localeCompare(b.roomId) || a.start.localeCompare(b.start)),
    };
  }
}
