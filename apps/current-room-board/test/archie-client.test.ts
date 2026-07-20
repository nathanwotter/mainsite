import { afterEach, describe, expect, it, vi } from "vitest";
import { archieFetch, ArchieRateLimitError, fetchWithRetry } from "@/lib/archie/client";
import { clearArchieTokenCache } from "@/lib/archie/auth";

describe("Archie client retries", () => {
  afterEach(() => {
    clearArchieTokenCache();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refreshes the token once after 401 and retries the API call", async () => {
    vi.stubEnv("ARCHIE_API_BASE_URL", "https://api.archieapp.co/v1");
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "first", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "second", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const response = await archieFetch("/spaces/current/bookings");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: expect.objectContaining({ Authorization: "Bearer first" }) });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ headers: expect.objectContaining({ Authorization: "Bearer second" }) });
  });

  it("throws authentication failure after a second 401", async () => {
    vi.stubEnv("ARCHIE_CLIENT_ID", "id");
    vi.stubEnv("ARCHIE_CLIENT_SECRET", "secret");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "first", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "second", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }));

    await expect(archieFetch("/spaces/current/bookings")).rejects.toThrow(/after token refresh/);
  });

  it("honors Retry-After on 429", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await expect(fetchWithRetry("https://example.test", {}, sleep)).resolves.toHaveProperty("status", 200);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("backs off with jitter on 429 without Retry-After", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("", { status: 429 }));

    await expect(fetchWithRetry("https://example.test", {}, sleep)).rejects.toBeInstanceOf(ArchieRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.every(([ms]) => ms >= 300 && ms <= 1450)).toBe(true);
  });
});
