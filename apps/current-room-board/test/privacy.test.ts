import { afterEach, describe, expect, it, vi } from "vitest";
import { clearArchieTokenCache } from "@/lib/archie/auth";
import {
  clearPractitionerIdentityCache,
  practitionerDisplayNameForBooking,
  practitionerReferenceFromBooking,
  publicUserDisplayName,
  resolvePractitionerIdentities,
} from "@/lib/archie/practitioners";
import type { ArchieBooking } from "@/lib/archie/schemas";

const booking = {
  uuid: "booking-1",
  item_uuid: "room-a",
  start_date: "2026-07-18T13:00:00.000Z",
  end_date: "2026-07-18T14:00:00.000Z",
  cancelled: false,
  approval_status: "approved",
  responsible: {
    uuid: "staff-creator",
    fullname: "Staff Creator",
    email: "staff@example.com",
  },
  beneficiary_type: "user",
  user_beneficiary: {
    uuid: "practitioner-user",
    fullname: "Practitioner Member",
    email: "member@example.com",
  },
  name: "Sensitive Booking Title",
  description: "Sensitive customer description",
  note: "Sensitive private note",
} satisfies ArchieBooking;

describe("practitioner privacy", () => {
  afterEach(() => {
    clearArchieTokenCache();
    clearPractitionerIdentityCache();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("selects the user beneficiary when staff creator differs from practitioner", () => {
    expect(practitionerReferenceFromBooking(booking)).toEqual({
      kind: "user",
      sourceField: "user_beneficiary",
      id: "practitioner-user",
      embeddedUser: booking.user_beneficiary,
    });
  });

  it("ignores responsible when beneficiary is the verified practitioner", () => {
    const identities = new Map([
      ["user:practitioner-user", { id: "practitioner-user", displayName: "Practitioner Member" }],
      ["user:staff-creator", { id: "staff-creator", displayName: "Staff Creator" }],
    ]);

    expect(practitionerDisplayNameForBooking(booking, identities)).toBe("Practitioner Member");
  });

  it("resolves a user-type practitioner without exposing private fields", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uuid: "practitioner-user",
        fullname: "Dynamic Practitioner",
        email: "member@example.com",
        notes: "Never show this",
      }), { status: 200 }));

    const identities = await resolvePractitionerIdentities([booking], "current-wellness");
    const serialized = JSON.stringify([...identities.values()]);

    expect(identities.get("user:practitioner-user")).toEqual({ id: "practitioner-user", displayName: "Dynamic Practitioner" });
    expect(serialized).not.toContain("member@example.com");
    expect(serialized).not.toContain("Never show this");
    expect(serialized).not.toContain("Sensitive");
  });

  it("resolves a group-type practitioner only when the group has exactly one user", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        uuid: "group-1",
        users: [{ uuid: "group-user", fullname: "Solo Group Practitioner", email: "solo@example.com" }],
      }), { status: 200 }));

    const identities = await resolvePractitionerIdentities([{
      ...booking,
      beneficiary_type: "group",
      user_beneficiary: undefined,
      group_beneficiary: { uuid: "group-1", users: [] },
    }], "current-wellness");

    expect(identities.get("group:group-1")).toEqual({ id: "group-user", displayName: "Solo Group Practitioner" });
  });

  it("keeps missing practitioner identity as Reserved", () => {
    expect(practitionerReferenceFromBooking({
      ...booking,
      beneficiary_type: undefined,
      user_beneficiary: undefined,
    })).toBeNull();
    expect(practitionerDisplayNameForBooking({
      ...booking,
      beneficiary_type: undefined,
      user_beneficiary: undefined,
    }, new Map())).toBe("Reserved");
  });

  it("falls back to embedded beneficiary name on lookup failure", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 }));

    const identities = await resolvePractitionerIdentities([booking], "current-wellness");
    expect(identities.get("user:practitioner-user")).toEqual({ id: "practitioner-user", displayName: "Practitioner Member" });
  });

  it("degrades a malformed practitioner-name lookup to Reserved without failing the schedule", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fullname: "Missing Stable ID" }), { status: 200 }));

    const diagnostics = { attempted: 0, succeeded: 0, failed: 0, failureMessages: [] as string[] };
    const identities = await resolvePractitionerIdentities([{
      ...booking,
      user_beneficiary: undefined,
      beneficiary_uuid: "lookup-only-user",
    }], "current-wellness", diagnostics);

    expect(identities.get("user:lookup-only-user")).toEqual({ id: "reserved", displayName: "Reserved" });
    expect(diagnostics).toMatchObject({ attempted: 1, succeeded: 0, failed: 1 });
    expect(diagnostics.failureMessages[0]).toContain("schema");
  });

  it("redacts email-like and URL-like Archie name values", () => {
    expect(publicUserDisplayName({ uuid: "user-1", fullname: "person@example.com" })).toBeUndefined();
    expect(publicUserDisplayName({ uuid: "user-1", fullname: "https://example.com/name" })).toBeUndefined();
  });
});
