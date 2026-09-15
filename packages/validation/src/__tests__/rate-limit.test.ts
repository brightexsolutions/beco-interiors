import { beforeEach, describe, expect, it } from 'vitest';
import { createRateLimiter, MemoryRateLimitStore } from '../rate-limit';

describe('createRateLimiter', () => {
  let clock: number;
  const now = () => clock;

  beforeEach(() => {
    clock = 1_000_000;
  });

  it('allows up to the limit, then turns the next one away', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now });
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('a').ok).toBe(false);
  });

  it('counts each key independently', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now });
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('b').ok).toBe(true);
    expect(rl.check('a').ok).toBe(false);
  });

  it('reports how many requests remain', () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now });
    expect(rl.check('a').remaining).toBe(2);
    expect(rl.check('a').remaining).toBe(1);
    expect(rl.check('a').remaining).toBe(0);
  });

  it('frees a slot once the oldest hit ages past the window', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000, now });
    rl.check('a'); // t = 1_000_000
    clock += 30_000;
    rl.check('a'); // t = 1_030_000, now at the limit
    expect(rl.check('a').ok).toBe(false);

    clock += 30_001; // the first hit is now 60_001ms old, outside the window
    expect(rl.check('a').ok).toBe(true);
  });

  it('reports the wait until the next slot frees, not a guess', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now });
    rl.check('a');
    clock += 10_000;
    const denied = rl.check('a');
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterMs).toBe(50_000);
  });

  it('never reports a negative wait', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now });
    rl.check('a');
    clock += 5000;
    // The window has fully passed, so this is allowed rather than denied,
    // but the guard on retryAfterMs is what this pins.
    expect(rl.check('a')).toEqual({ ok: true, remaining: 0, retryAfterMs: 0 });
  });

  it('shares state when given a shared store', () => {
    const store = new MemoryRateLimitStore();
    const a = createRateLimiter({ limit: 1, windowMs: 60_000, store, now });
    const b = createRateLimiter({ limit: 1, windowMs: 60_000, store, now });
    expect(a.check('k').ok).toBe(true);
    expect(b.check('k').ok).toBe(false);
  });
});
