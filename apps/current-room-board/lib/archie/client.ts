import { clearArchieTokenCache, getArchieAccessToken } from "@/lib/archie/auth";
import { ArchieAuthenticationError } from "@/lib/archie/types";

export class ArchieRateLimitError extends Error {}
export class ArchieUnavailableError extends Error {}

export async function archieFetch(path: string, init: RequestInit = {}, retry401 = true): Promise<Response> {
  const baseUrl = process.env.ARCHIE_API_BASE_URL || "https://api.archieapp.co/v1";
  const token = await getArchieAccessToken();
  const response = await fetchWithRetry(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401 && retry401) {
    clearArchieTokenCache();
    return archieFetch(path, init, false);
  }

  if (response.status === 401) {
    throw new ArchieAuthenticationError("Archie authentication failed after token refresh");
  }

  return response;
}

export async function fetchWithRetry(url: string, init: RequestInit, sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url, init);
    if (response.status !== 429 && response.status < 500) return response;

    if (response.status === 429 && attempt === maxAttempts - 1) {
      throw new ArchieRateLimitError("Archie rate limited the request");
    }
    if (attempt === maxAttempts - 1) {
      throw new ArchieUnavailableError("Archie is unavailable");
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const retryAfterMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 0;
    const jitter = Math.floor(Math.random() * 250);
    const backoffMs = Math.min(5000, retryAfterMs || 300 * 2 ** attempt + jitter);
    await sleep(backoffMs);
  }
  throw new ArchieUnavailableError("Archie is unavailable");
}
