import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@beco/supabase-client', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const resolveSessionUser = vi.fn();
vi.mock('@/lib/session', () => ({
  resolveSessionUser: (...a: unknown[]) => resolveSessionUser(...a),
}));

const { proxy } = await import('../proxy');

const requestFor = (path = '/', cookies: Record<string, string> = {}) => {
  const req = new NextRequest(new URL(`http://localhost:3001${path}`));
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
};

const AUTHED = { 'sb-localhost-auth-token': 'x' };

/** A session user row as `resolveSessionUser` would return it. */
const user = (
  over: Partial<{ role: string | null; isActive: boolean; mustChangePassword: boolean }> = {},
) => ({
  userId: 'u1',
  email: 'u@beco.co.ke',
  fullName: 'U Ser',
  role: 'beco_sales' as string | null,
  isActive: true,
  mustChangePassword: false,
  ...over,
});

const location = (res: Response) =>
  res.headers.get('location') ? new URL(res.headers.get('location')!) : null;

afterEach(() => {
  getUser.mockReset();
  resolveSessionUser.mockReset();
});

describe('dashboard proxy: session gate', () => {
  it('sends a signed-out visitor to /login with a return path', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(requestFor('/quotes'));
    expect(res.status).toBe(307);
    expect(location(res)?.pathname).toBe('/login');
    expect(location(res)?.searchParams.get('next')).toBe('/quotes');
    expect(resolveSessionUser).not.toHaveBeenCalled();
  });

  it('does not add a return path when the target was the root', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(requestFor('/'));
    expect(location(res)?.pathname).toBe('/login');
    expect(location(res)?.searchParams.has('next')).toBe(false);
  });
});

describe('dashboard proxy: deactivation ends the session', () => {
  it('bounces a session whose user row is gone, and clears the auth cookie', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(null);
    const res = await proxy(requestFor('/quotes', AUTHED));
    expect(location(res)?.pathname).toBe('/login');
    expect(location(res)?.searchParams.get('denied')).toBe('1');
    expect(res.cookies.get('sb-localhost-auth-token')?.value).toBe('');
  });

  it('bounces a user deactivated mid-session, whose role has gone null', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ role: null, isActive: false }));
    const res = await proxy(requestFor('/quotes', AUTHED));
    expect(location(res)?.pathname).toBe('/login');
    expect(location(res)?.searchParams.get('denied')).toBe('1');
    expect(res.cookies.get('sb-localhost-auth-token')?.value).toBe('');
  });
});

describe('dashboard proxy: forced password change', () => {
  it('redirects a flagged user to /change-password from any other route', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ mustChangePassword: true }));
    const res = await proxy(requestFor('/quotes', AUTHED));
    expect(location(res)?.pathname).toBe('/change-password');
  });

  it('redirects a flagged admin off /launch too, so the gate cannot be walked around', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ role: 'beco_admin', mustChangePassword: true }));
    const res = await proxy(requestFor('/launch', AUTHED));
    expect(location(res)?.pathname).toBe('/change-password');
  });

  it('lets a flagged user reach /change-password itself', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ mustChangePassword: true }));
    const res = await proxy(requestFor('/change-password', AUTHED));
    expect(location(res)).toBeNull();
    expect(res.status).toBe(200);
  });
});

describe('dashboard proxy: per-route role check', () => {
  const cases: Array<[string, string, string | null]> = [
    // role,                 path,             null = allowed, else = redirect target
    ['beco_sales', '/quotes', null],
    ['beco_sales', '/orders', null],
    ['beco_sales', '/', null],
    ['beco_sales', '/users', '/quotes'],
    ['beco_sales', '/stock', '/quotes'],
    ['beco_sales', '/settings', '/quotes'],
    ['beco_product_manager', '/stock', null],
    ['beco_product_manager', '/products', null],
    ['beco_product_manager', '/quotes', '/products'],
    ['beco_product_manager', '/users', '/products'],
    ['beco_admin', '/', null],
    ['beco_admin', '/quotes', null],
    ['beco_admin', '/settings', null],
    ['beco_admin', '/launch', null],
    ['beco_admin', '/users', '/'],
    ['brightex_admin', '/users', null],
    ['brightex_admin', '/launch', null],
    ['beco_editor', '/', null],
    ['beco_editor', '/quotes', '/'],
    ['beco_editor', '/products', '/'],
  ];

  it.each(cases)('%s at %s', async (role, path, expected) => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ role }));
    const res = await proxy(requestFor(path, AUTHED));
    if (expected === null) {
      expect(location(res)).toBeNull();
      expect(res.status).toBe(200);
    } else {
      expect(location(res)?.pathname).toBe(expected);
    }
  });

  it('covers a nested path by its prefix rule', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    resolveSessionUser.mockResolvedValue(user({ role: 'beco_sales' }));
    const ok = await proxy(requestFor('/quotes/BEC-Q-00042', AUTHED));
    expect(location(ok)).toBeNull();

    resolveSessionUser.mockResolvedValue(user({ role: 'beco_sales' }));
    const denied = await proxy(requestFor('/users/new', AUTHED));
    expect(location(denied)?.pathname).toBe('/quotes');
  });
});
