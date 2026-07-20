export interface Room {
  id: string;
  name: string;
  sortOrder: number;
}

export type ReservationStatus = "reserved" | "blocked";

export interface RoomReservation {
  id: string;
  roomId: string;
  start: string;
  end: string;
  practitionerDisplayName: string;
  status: ReservationStatus;
}

export interface DailyRoomSchedule {
  date: string;
  timezone: string;
  generatedAt: string;
  rooms: Room[];
  reservations: RoomReservation[];
}

export interface AvailabilityInterval {
  roomId: string;
  start: string;
  end: string;
}

export type ScheduleErrorCode =
  | "INVALID_DATE"
  | "ARCHIE_AUTHENTICATION_FAILED"
  | "ARCHIE_RATE_LIMITED"
  | "ARCHIE_UNAVAILABLE"
  | "ARCHIE_SCHEMA_CHANGED"
  | "CONFIGURATION_ERROR";
