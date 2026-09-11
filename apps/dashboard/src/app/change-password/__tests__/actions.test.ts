import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...a: unknown[]) => redirect(...a) }));

const updateUser = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabase: async () => ({ auth: { updateUser }, rpc }),
}));

const requireSignedIn = vi.fn();
vi.mock('@/lib/session', () => ({
  requireSignedIn: (...a: unknown[]) => requireSignedIn(...a),
}));

const { changePassword } = await import('../actions');

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const good = { password: 'a proper long password', confirm: 'a proper long password' };

beforeEach(() => {
  updateUser.mockReset().mockResolvedValue({ error: null });
  rpc.mockReset().mockResolvedValue({ error: null });
  requireSignedIn.mockReset().mockResolvedValue({ userId: 'u1', role: 'beco_sales', mustChangePassword: true });
  redirect.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('changePassword', () => {
  it('rejects a password under 10 characters before touching Supabase', async () => {
    const r = await changePassword({}, form({ password: 'short', confirm: 'short' }));
    expect(r.error).toMatch(/10 characters/i);
    expect(updateUser).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('rejects a mismatch between the two fields', async () => {
    const r = await changePassword({}, form({ password: 'a proper long password', confirm: 'a different one entirely' }));
    expect(r.error).toMatch(/do not match/i);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('surfaces a Supabase rejection as one generic message, and does not clear the flag', async () => {
    updateUser.mockResolvedValue({ error: { message: 'New password should be different from the old password.' } });
    const r = await changePassword({}, form(good));
    expect(r.error).toMatch(/cannot be used/i);
    expect(rpc).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('reports a failure to clear the forced-change flag rather than pretending it worked', async () => {
    rpc.mockResolvedValue({ error: { message: 'rpc blew up' } });
    const r = await changePassword({}, form(good));
    expect(r.error).toMatch(/finishing sign-in failed/i);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sets the password, clears the flag via the RPC, and lands the role on its home', async () => {
    await changePassword({}, form(good));
    expect(updateUser).toHaveBeenCalledWith({ password: good.password });
    expect(rpc).toHaveBeenCalledWith('complete_first_login');
    expect(redirect).toHaveBeenCalledWith('/quotes');
  });

  it('lands an admin on the dashboard home', async () => {
    requireSignedIn.mockResolvedValue({ userId: 'u1', role: 'beco_admin', mustChangePassword: true });
    await changePassword({}, form(good));
    expect(redirect).toHaveBeenCalledWith('/');
  });
});
