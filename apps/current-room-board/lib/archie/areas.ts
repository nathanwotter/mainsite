export const ARCHIE_CONFERENCE_ROOM_CATEGORY = "conference-room";
export const ARCHIE_PUBLIC_ROOM_CATEGORIES = ["conference-room", "office"] as const;

export function getArchieSpaceDomain() {
  return process.env.ARCHIE_SPACE_DOMAIN || process.env.ARCHIE_LOCATION_ID;
}

export function conferenceRoomsPath(spaceDomain: string, startAfter?: string) {
  const params = new URLSearchParams();
  for (const category of ARCHIE_PUBLIC_ROOM_CATEGORIES) {
    params.append("categories[]", category);
  }
  if (startAfter) params.set("startAfter", startAfter);
  return `/spaces/${encodeURIComponent(spaceDomain)}/conferenceRooms?${params.toString()}`;
}

export function unfilteredConferenceRoomsPath(spaceDomain: string) {
  return `/spaces/${encodeURIComponent(spaceDomain)}/conferenceRooms`;
}
