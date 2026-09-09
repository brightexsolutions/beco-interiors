import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
vi.mock('@beco/supabase-client', () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const resolveAdminRole = vi.fn();
vi.mock('../lib/session', () => ({ resolveAdminRole: (...a: unknown[]) => resolveAdminRole(...a) }));

const { proxy } = await import('../proxy');

const requestFor = (path = '/launch', cookies: Record<string, string> = {}) => {
  const req = new NextRequest(new URL(`http://localhost:3001${path}`));
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value);
  return req;
};

afterEach(() => {
  getUser.mockReset();
  resolveAdminRole.mockReset();
});

describe('dashboard proxy on /launch', () => {
  it('sends a signed-out visitor to /login with a return path', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await proxy(requestFor('/launch'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/launch');
    expect(resolveAdminRole).not.toHaveBeenCalled();
  });

  it('turns away a VALID session whose role is not admin, before the page renders', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'sales-1' } } });
    resolveAdminRole.mockResolvedValue(null);
    const res = await proxy(requestFor('/launch', { 'sb-localhost-auth-token': 'x' }));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('denied')).toBe('1');
  });

  it('lets an active admin through', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
    resolveAdminRole.mockResolvedValue('beco_admin');
    const res = await proxy(requestFor('/launch', { 'sb-localhost-auth-token': 'x' }));
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});
