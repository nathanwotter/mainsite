import { afterEach, describe, expect, it, vi } from "vitest";
import { clearArchieTokenCache, getArchieAccessToken } from "@/lib/archie/auth";

describe("Archie authentication", () => {
  afterEach(() => {
    clearArchieTokenCache();
    vi.unstubAllEnvs();
  });

  it("posts documented credentials and caches the token", async () => {
    vi.stubEnv("ARCHIE_API_BASE_URL", "https://api.archieapp.co/v1");
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "token", expires_in: 3600 }),
    });

    await expect(getArchieAccessToken(fetchMock as unknown as typeof fetch)).resolves.toBe("token");
    await expect(getArchieAccessToken(fetchMock as unknown as typeof fetch)).resolves.toBe("token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.archieapp.co/v1/authenticate", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ client_id: "id", client_secret: "secret" }),
    }));
  });

  it("rejects changed token schemas", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "nope" }),
    });
    await expect(getArchieAccessToken(fetchMock as unknown as typeof fetch)).rejects.toThrow(/schema/);
  });

  it("deduplicates concurrent token requests", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "token", expires_in: 3600 }),
    });

    const [first, second, third] = await Promise.all([
      getArchieAccessToken(fetchMock as unknown as typeof fetch),
      getArchieAccessToken(fetchMock as unknown as typeof fetch),
      getArchieAccessToken(fetchMock as unknown as typeof fetch),
    ]);

    expect([first, second, third]).toEqual(["token", "token", "token"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
