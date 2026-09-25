import { beforeEach, describe, expect, it, vi } from 'vitest';

const signOut = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabase: async () => ({ auth: { signOut } }),
}));

const { POST } = await import('../route');

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue({ error: null });
});

const post = () => POST(new Request('http://localhost:3001/sign-out', { method: 'POST' }));

describe('POST /sign-out', () => {
  it('ends the Supabase session', async () => {
    await post();
    expect(signOut).toHaveBeenCalled();
  });

  it('sends the browser to the login screen', async () => {
    const res = await post();
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login');
  });

  it('redirects with 303, so the follow-up is a GET rather than a repeated POST', async () => {
    // A 307 preserves the method, which would re-POST /login and put a
    // "confirm form resubmission" prompt behind any refresh.
    expect((await post()).status).toBe(303);
  });

  it('clears the session before redirecting, not after', async () => {
    // Order matters: a redirect issued first would race the cookie clear and
    // could land on /login with the session still live, which then bounces
    // straight back into the dashboard.
    const order: string[] = [];
    signOut.mockImplementation(async () => {
      order.push('signOut');
      return { error: null };
    });
    const res = await post();
    order.push(`redirect:${res.status}`);
    expect(order).toEqual(['signOut', 'redirect:303']);
  });
});
