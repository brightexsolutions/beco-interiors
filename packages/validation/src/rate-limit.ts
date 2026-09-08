/**
 * A sliding-window rate limiter for public write endpoints, per rule 7.
 *
 * This is a STOPGAP and is documented as one. The durable layer is a
 * Cloudflare rate-limit rule at the edge, which needs the M1 DNS cutover
 * before it can exist. Until then this runs in the app: it stops a burst
 * from a single caller, and because the store is in memory it is per
 * instance and resets on deploy. That is a real limitation, not a bug, and
 * it is why the edge rule still has to happen. See D81.
 *
 * The algorithm is an exact sliding-window log: every hit's timestamp is
 * kept, anything older than the window is dropped on the next check, and
 * the limit is the count that survives. No approximation, so the unit
 * tests can assert exact boundaries.
 *
 * The store and the clock are injectable so the tests do not sleep and a
 * caller can swap in a shared store later without touching this file.
 */

export interface RateLimitStore {
  get(key: string): number[] | undefined;
  set(key: string, hits: number[]): void;
}

/** The default store: a Map, private to one server instance. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  get(key: string): number[] | undefined {
    return this.hits.get(key);
  }

  set(key: string, hits: number[]): void {
    this.hits.set(key, hits);
  }
}

export interface RateLimiterOptions {
  /** Requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Defaults to a fresh in-memory store. */
  store?: RateLimitStore;
  /** Defaults to `Date.now`. */
  now?: () => number;
}

export interface RateLimitResult {
  /** False when the caller is over the limit and should be turned away. */
  ok: boolean;
  /** Requests still allowed in the current window. Zero when `ok` is false. */
  remaining: number;
  /** Milliseconds until the oldest hit ages out. Zero when `ok` is true. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Records a hit for `key` and reports whether it is allowed. */
  check(key: string): RateLimitResult;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const store = options.store ?? new MemoryRateLimitStore();
  const now = options.now ?? Date.now;

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const cutoff = t - windowMs;
      const recent = (store.get(key) ?? []).filter((ts) => ts > cutoff);

      if (recent.length >= limit) {
        // recent is sorted ascending because hits are appended in time
        // order, so [0] is the oldest and the first to free a slot.
        const oldest = recent[0] ?? t;
        store.set(key, recent);
        return { ok: false, remaining: 0, retryAfterMs: Math.max(0, oldest + windowMs - t) };
      }

      recent.push(t);
      store.set(key, recent);
      return { ok: true, remaining: limit - recent.length, retryAfterMs: 0 };
    },
  };
}
