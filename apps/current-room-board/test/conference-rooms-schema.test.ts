import { describe, expect, it } from "vitest";
import { conferenceRoomsPath, getArchieSpaceDomain } from "@/lib/archie/areas";
import { conferenceRoomsResponseSchema, getConferenceRoomsFromResponse } from "@/lib/archie/schemas";

describe("conference room response schema", () => {
  it("parses the live/documented wrapper shape with data", () => {
    const parsed = conferenceRoomsResponseSchema.safeParse({
      data: [
        {
          uuid: "room-1",
          slug: "room-one",
          name: "Room One",
          category: "conference-room",
          archived: false,
        },
      ],
      has_more: false,
      next_token: "",
      request_uuid: "request-1",
      total_count: 1,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && getConferenceRoomsFromResponse(parsed.data)).toHaveLength(1);
  });

  it("still accepts a raw array for the published reference shape", () => {
    const parsed = conferenceRoomsResponseSchema.safeParse([
      { uuid: "room-1", slug: "room-one", category: "conference-room" },
    ]);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("Expected conference rooms response to parse");
    expect(getConferenceRoomsFromResponse(parsed.data)[0]?.uuid).toBe("room-1");
  });

  it("uses the documented conference-room category filter for live room lookups", () => {
    expect(conferenceRoomsPath("current-wellness")).toBe(
      "/spaces/current-wellness/conferenceRooms?categories%5B%5D=conference-room&categories%5B%5D=office",
    );
    expect(conferenceRoomsPath("current-wellness", "cursor-1")).toBe(
      "/spaces/current-wellness/conferenceRooms?categories%5B%5D=conference-room&categories%5B%5D=office&startAfter=cursor-1",
    );
  });

  it("reads the clearer space-domain env name before the legacy location id", () => {
    const originalSpaceDomain = process.env.ARCHIE_SPACE_DOMAIN;
    const originalLocationId = process.env.ARCHIE_LOCATION_ID;

    try {
      process.env.ARCHIE_SPACE_DOMAIN = "current-wellness";
      process.env.ARCHIE_LOCATION_ID = "legacy-domain";
      expect(getArchieSpaceDomain()).toBe("current-wellness");
    } finally {
      if (originalSpaceDomain === undefined) {
        delete process.env.ARCHIE_SPACE_DOMAIN;
      } else {
        process.env.ARCHIE_SPACE_DOMAIN = originalSpaceDomain;
      }
      if (originalLocationId === undefined) {
        delete process.env.ARCHIE_LOCATION_ID;
      } else {
        process.env.ARCHIE_LOCATION_ID = originalLocationId;
      }
    }
  });
});
