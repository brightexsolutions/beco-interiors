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
const signOut = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabase: async () => ({ auth: { signInWithPassword, signOut }, rpc }),
}));

const resolveSessionUser = vi.fn();
vi.mock('@/lib/session', () => ({
  resolveSessionUser: (...a: unknown[]) => resolveSessionUser(...a),
}));

const { signIn } = await import('../actions');

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const validCreds = { email: 'sam.odhiambo@beco.co.ke', password: 'correct horse staple' };
const activeUser = { userId: 'u1', email: validCreds.email, fullName: 'Sam Odhiambo', role: 'beco_sales', isActive: true, mustChangePassword: false };

/** signInWithPassword's success shape: data.user must be present. */
const authOk = { data: { user: { id: 'u1' } }, error: null };
const authFail = { data: { user: null }, error: { message: 'Invalid login credentials' } };

let testId = 0;
beforeEach(() => {
  clientIp = `ip-${++testId}`;
  signInWithPassword.mockReset();
  signOut.mockReset();
  rpc.mockReset().mockResolvedValue({ error: null });
  resolveSessionUser.mockReset().mockResolvedValue(activeUser);
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
    signInWithPassword.mockResolvedValue(authFail);
    const result = await signIn({}, form(validCreds));
    expect(result?.error).toMatch(/do not match an account/i);
    expect(redirect).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('signs a deactivated or unknown account straight back out, with the same message', async () => {
    signInWithPassword.mockResolvedValue(authOk);
    resolveSessionUser.mockResolvedValue(null);
    const result = await signIn({}, form(validCreds));
    expect(result?.error).toMatch(/do not match an account/i);
    expect(signOut).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('records the sign-in and redirects home on success', async () => {
    signInWithPassword.mockResolvedValue(authOk);
    await signIn({}, form(validCreds));
    expect(signInWithPassword).toHaveBeenCalledWith(validCreds);
    expect(rpc).toHaveBeenCalledWith('record_sign_in');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('honours a local return path', async () => {
    signInWithPassword.mockResolvedValue(authOk);
    await signIn({}, form({ ...validCreds, next: '/quotes' }));
    expect(redirect).toHaveBeenCalledWith('/quotes');
  });

  it('ignores an off-site return path, landing home instead', async () => {
    signInWithPassword.mockResolvedValue(authOk);
    await signIn({}, form({ ...validCreds, next: 'https://evil.example/steal' }));
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('turns a burst away after the tenth attempt, without asking Supabase again', async () => {
    clientIp = 'burst-ip';
    signInWithPassword.mockResolvedValue(authFail);
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
