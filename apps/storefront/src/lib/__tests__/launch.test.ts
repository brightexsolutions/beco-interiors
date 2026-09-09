import { afterEach, describe, expect, it, vi } from 'vitest';

const inMock = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ in: inMock }) }),
  }),
}));

const { getLaunchState } = await import('../launch');

afterEach(() => inMock.mockReset());

describe('getLaunchState', () => {
  it('reads both keys when the query succeeds', async () => {
    inMock.mockResolvedValue({
      data: [
        { key: 'site_launch_at', value: '2026-10-16T18:00:00Z' },
        { key: 'site_launch_live', value: true },
      ],
      error: null,
    });
    expect(await getLaunchState()).toEqual({
      launchAt: '2026-10-16T18:00:00Z',
      isLive: true,
    });
  });

  it('falls back to nothing scheduled on a Supabase error, and never throws', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'connection lost' } });
    expect(await getLaunchState()).toEqual({ launchAt: null, isLive: false });
  });

  it('falls back when data comes back null with no error', async () => {
    inMock.mockResolvedValue({ data: null, error: null });
    expect(await getLaunchState()).toEqual({ launchAt: null, isLive: false });
  });

  it('treats a missing site_launch_live row as not live', async () => {
    inMock.mockResolvedValue({ data: [{ key: 'site_launch_at', value: null }], error: null });
    expect(await getLaunchState()).toEqual({ launchAt: null, isLive: false });
  });

  it('does not read live from a value that is truthy but not exactly true', async () => {
    inMock.mockResolvedValue({ data: [{ key: 'site_launch_live', value: 'true' }], error: null });
    expect((await getLaunchState()).isLive).toBe(false);
  });
});
