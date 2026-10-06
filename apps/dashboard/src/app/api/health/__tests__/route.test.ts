import { afterEach, describe, expect, it, vi } from 'vitest';

const limit = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({ select: () => ({ limit }) }) }),
}));

const { GET } = await import('../route');

afterEach(() => {
  limit.mockReset();
  vi.unstubAllEnvs();
});

describe('GET /api/health', () => {
  it('answers 200 when the database read succeeds, and never caches', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    limit.mockResolvedValue({ data: [{ key: 'vat_rate' }], error: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true, database: 'up' });
  });

  it('answers 503 when the database refuses, without echoing the error', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    limit.mockResolvedValue({ data: null, error: { message: 'connection refused at db.internal' } });
    const response = await GET();
    expect(response.status).toBe(503);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain('db.internal');
    expect(body).toContain('"down"');
  });

  it('answers 503 when the environment is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const response = await GET();
    expect(response.status).toBe(503);
    expect(limit).not.toHaveBeenCalled();
  });
});
