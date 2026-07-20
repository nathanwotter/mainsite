interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const values = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedSingleFlight<T>(key: string, ttlMs: number, load: () => Promise<T>) {
  const existing = values.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return { value: existing.value as T, cache: "HIT" as const };
  }

  const active = inflight.get(key) as Promise<T> | undefined;
  if (active) {
    return { value: await active, cache: "DEDUPED" as const };
  }

  const promise = load();
  inflight.set(key, promise);
  try {
    const value = await promise;
    values.set(key, { value, expiresAt: Date.now() + ttlMs });
    return { value, cache: "MISS" as const };
  } finally {
    inflight.delete(key);
  }
}
