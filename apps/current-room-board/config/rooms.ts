export interface RoomMapping {
  archieResourceId: string;
  displayName: string;
  sortOrder: number;
  visible: boolean;
}

export const roomMappings: RoomMapping[] = [
  { archieResourceId: "12ea9174-7151-5a45-84a4-3d178e3b6cce", displayName: "Confluence", sortOrder: 10, visible: true },
  { archieResourceId: "b4cc4859-8845-5d52-9669-f629affbc83c", displayName: "Basin", sortOrder: 20, visible: true },
  { archieResourceId: "49c4aca0-0f72-51fa-99d7-8a46ffbc7622", displayName: "Delta", sortOrder: 30, visible: true },
  { archieResourceId: "6a75e027-382f-508b-9569-0cb8e9025cb4", displayName: "Tributary", sortOrder: 40, visible: true },
];

export function validateRoomMappings(mappings = roomMappings): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const room of mappings) {
    if (seen.has(room.archieResourceId)) {
      duplicates.add(room.archieResourceId);
    }
    seen.add(room.archieResourceId);
  }

  return [...duplicates];
}

export function getVisibleRooms(mappings = roomMappings) {
  return mappings
    .filter((room) => room.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((room) => ({
      id: room.archieResourceId,
      name: room.displayName,
      sortOrder: room.sortOrder,
    }));
}
