interface CachedResult {
  response: unknown;
  cachedAt: number;
}

const cache = new Map<string, CachedResult>();
const TTL_MS = 10 * 60 * 1000;

export function getCachedResult(jobId: string): unknown | null {
  const entry = cache.get(jobId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    cache.delete(jobId);
    return null;
  }
  return entry.response;
}

export function cacheResult(jobId: string, response: unknown): void {
  cache.set(jobId, { response, cachedAt: Date.now() });
  if (cache.size > 10_000) pruneCache();
}

function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > TTL_MS) cache.delete(key);
  }
}

export function clearCache(): void {
  cache.clear();
}
