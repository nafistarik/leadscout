/**
 * Small in-memory TTL cache plus in-flight request deduplication.
 *
 * - Cache keys are derived from normalized search parameters, so identical
 *   searches reuse results without touching the network.
 * - Simultaneous identical searches share one promise instead of sending
 *   duplicate requests (each caller still applies its own abort handling).
 * - Caching reduces load on public APIs but never guarantees availability:
 *   expired or evicted entries simply trigger a fresh request.
 */
interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export class TtlCache<T> {
  private entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Builds a stable cache key from normalized search parameters. */
export function searchCacheKey(params: Record<string, string | number>): string {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key.trim().toLowerCase()] =
      typeof value === "number" ? String(value) : value.trim().toLowerCase();
  }
  return JSON.stringify(normalized);
}

export class InflightDeduper<T> {
  private inflight = new Map<string, Promise<T>>();

  /**
   * Returns the existing in-flight promise for `key`, or runs `start` and
   * shares its promise with concurrent callers. Settled entries are removed.
   */
  run(key: string, start: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const promise = start().finally(() => {
      if (this.inflight.get(key) === promise) this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }
}
