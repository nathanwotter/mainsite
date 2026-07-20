import { tokenResponseSchema } from "@/lib/archie/schemas";
import { ArchieAuthenticationError, ArchieSchemaChangedError } from "@/lib/archie/types";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
let refreshPromise: Promise<CachedToken> | null = null;

export function clearArchieTokenCache() {
  cachedToken = null;
  refreshPromise = null;
}

export async function getArchieAccessToken(fetchImpl: typeof fetch = fetch) {
  const skewMs = 60_000;
  if (cachedToken && cachedToken.expiresAt - skewMs > Date.now()) {
    return cachedToken.accessToken;
  }

  refreshPromise ??= requestToken(fetchImpl).finally(() => {
    refreshPromise = null;
  });

  const token = await refreshPromise;
  cachedToken = token;
  return token.accessToken;
}

async function requestToken(fetchImpl: typeof fetch): Promise<CachedToken> {
  const baseUrl = process.env.ARCHIE_API_BASE_URL || "https://api.archieapp.co/v1";
  const clientId = process.env.ARCHIE_CLIENT_ID;
  const clientSecret = process.env.ARCHIE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ArchieAuthenticationError("Missing Archie client credentials");
  }

  const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ArchieAuthenticationError(`Archie authentication failed with status ${response.status}`);
  }

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new ArchieSchemaChangedError("Archie token schema changed");
  }

  return {
    accessToken: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1000,
  };
}
