import { describe, expect, it } from "vitest";
import { getVisibleRooms, validateRoomMappings } from "@/config/rooms";

describe("public room configuration", () => {
  it("orders all six public rooms left to right", () => {
    expect(getVisibleRooms().map((room) => room.name)).toEqual([
      "Confluence",
      "Basin",
      "Delta",
      "Tributary",
      "Schooner",
      "Pram",
    ]);
  });

  it("uses stable Archie UUIDs for Schooner and Pram", () => {
    expect(getVisibleRooms()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "1e0426c4-14e7-5a9b-99b7-a899d0e2115d",
        name: "Schooner",
        sortOrder: 50,
      }),
      expect.objectContaining({
        id: "248d7e04-fc69-5821-ad20-9d9ebae36d0d",
        name: "Pram",
        sortOrder: 60,
      }),
    ]));
    expect(validateRoomMappings()).toEqual([]);
  });
});
