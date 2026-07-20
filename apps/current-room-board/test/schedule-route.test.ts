import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/schedule/route";

describe("schedule API privacy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not expose sensitive client information in the public API response", async () => {
    vi.stubEnv("USE_MOCK_ARCHIE_DATA", "true");
    vi.stubEnv("KIOSK_ACCESS_KEY", "");

    const response = await GET(new Request("http://localhost/api/schedule?date=2026-07-18"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("Private Client Name");
    expect(body).not.toContain("example.com");
    expect(body).not.toContain("Sensitive");
    expect(body).not.toContain("note");
    expect(body).not.toContain("description");
    expect(body).not.toContain("warnings");
  });
});
