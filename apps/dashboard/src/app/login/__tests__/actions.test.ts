import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A distinct client address per test, so the module-level rate limiter's
// buckets do not collide between them.
let clientIp = 'base';
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (k: string) => (k === 'x-forwarded-for' ? clientIp : null),
  }),
}));

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }));

const signInWithPassword = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabase: async () => ({ auth: { signInWithPassword } }),
}));

const { signIn } = await import('../actions');

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const validCreds = { email: 'admin@beco.co.ke', password: 'correct horse' };

let testId = 0;
beforeEach(() => {
  clientIp = `ip-${++testId}`;
  signInWithPassword.mockReset();
  redirect.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('signIn', () => {
  it('rejects a malformed email before reaching Supabase', async () => {
    const result = await signIn({}, form({ ...validCreds, email: 'nope' }));
    expect(result?.error).toMatch(/email/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('gives one message for any auth failure, and does NOT start a session', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const result = await signIn({}, form(validCreds));
    expect(result?.error).toMatch(/do not match an account/i);
    // No redirect means the render never re-runs with new cookies: the
    // pre-login session, if any, is untouched.
    expect(redirect).not.toHaveBeenCalled();
  });

  it('signs in and redirects on success, so the render re-runs with the new session', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await signIn({}, form(validCreds));
    expect(signInWithPassword).toHaveBeenCalledWith(validCreds);
    expect(redirect).toHaveBeenCalledWith('/launch');
  });

  it('honours a local return path', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await signIn({}, form({ ...validCreds, next: '/launch/settings' }));
    expect(redirect).toHaveBeenCalledWith('/launch/settings');
  });

  it('ignores an off-site return path, landing on /launch instead', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await signIn({}, form({ ...validCreds, next: 'https://evil.example/steal' }));
    expect(redirect).toHaveBeenCalledWith('/launch');
  });

  it('turns a burst away after the tenth attempt, without asking Supabase again', async () => {
    clientIp = 'burst-ip';
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    for (let i = 0; i < 10; i++) {
      const r = await signIn({}, form(validCreds));
      expect(r?.error).toMatch(/do not match/i);
    }
    signInWithPassword.mockClear();
    const eleventh = await signIn({}, form(validCreds));
    expect(eleventh?.error).toMatch(/too many attempts/i);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
