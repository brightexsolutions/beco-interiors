import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'a',
  email: 'beco.brightex.dev@gmail.com',
  fullName: 'Brightex Ops',
  role: 'brightex_admin' as const,
  isActive: true,
  mustChangePassword: false,
  canWriteBlog: false,
  canReadAudit: false,
  canManageUsers: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const maybeSingle = vi.fn();
const getSupabase = vi.fn(async () => ({
  from: () => ({
    update: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => getSupabase() }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { saveLaunchDate, goLive, standDown } = await import('../actions');

afterEach(() => {
  maybeSingle.mockReset();
  requirePath.mockClear();
  getSupabase.mockClear();
});

const form = (launchAt: string) => {
  const f = new FormData();
  f.set('launchAt', launchAt);
  return f;
};

describe('launch actions', () => {
  it('re-checks the admin on every action, not just the render', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'site_launch_live' }, error: null });
    await goLive();
    expect(requirePath).toHaveBeenCalledWith('/launch');
  });

  it('reports a friendly error, not a throw, when the write is refused', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    const result = await goLive();
    expect(result).toEqual({ error: expect.stringMatching(/refused that write/i) });
  });

  it('confirms once the switch write succeeds', async () => {
    maybeSingle.mockResolvedValue({ data: { key: 'site_launch_live' }, error: null });
    expect((await goLive()).ok).toMatch(/live/i);
    expect((await standDown()).ok).toMatch(/countdown/i);
  });

  it('rejects a malformed date before touching the database', async () => {
    const result = await saveLaunchDate({}, form('not-a-date'));
    expect(result.error).toBeTruthy();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('saves a valid date and surfaces the write failure if one happens', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const result = await saveLaunchDate({}, form('2026-10-16T18:00:00Z'));
    expect(result.error).toMatch(/refused that write/i);
  });
});
