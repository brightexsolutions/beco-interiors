import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'admin-1',
  email: 'irene.kariuki@beco.co.ke',
  fullName: 'Irene Kariuki',
  role: 'beco_admin' as const,
  isActive: true,
  mustChangePassword: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

const maybeSingle = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const from = vi.fn(() => ({
  insert: (payload: unknown) => {
    insert(payload);
    return { select: () => ({ maybeSingle }) };
  },
  update: (payload: unknown) => {
    update(payload);
    return {
      eq: () => ({
        select: () => ({ maybeSingle }),
      }),
    };
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const revalidateStorefrontPaths = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefrontPaths: (...a: Parameters<typeof revalidateStorefrontPaths>) => revalidateStorefrontPaths(...a),
}));

const { createAnnouncement, updateAnnouncement } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  insert.mockReset();
  update.mockReset();
  revalidateStorefrontPaths.mockReset();
});

const formFrom = () => {
  const form = new FormData();
  form.set('title', 'Mid year sale');
  form.set('body', 'Selected slabs.');
  form.set('type', 'sale');
  form.set('ctaLabel', 'Shop stone');
  form.set('ctaUrl', '/shop');
  form.set('startsAt', '2026-09-19T08:00');
  form.set('endsAt', '2026-09-30T18:00');
  form.set('priority', '2');
  form.set('isActive', 'on');
  return form;
};

describe('createAnnouncement', () => {
  it('re-checks the session, stores Nairobi instants, and busts the storefront bar', async () => {
    maybeSingle.mockResolvedValue({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    const result = await createAnnouncement({}, formFrom());
    expect(requirePath).toHaveBeenCalledWith('/announcements');
    expect(result.ok).toBe('Announcement saved.');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mid year sale',
        starts_at: '2026-09-19T05:00:00.000Z',
        created_by: 'admin-1',
      }),
    );
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/']);
  });
});

describe('updateAnnouncement', () => {
  it('writes the id and busts the bar', async () => {
    maybeSingle.mockResolvedValue({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    const form = formFrom();
    form.set('announcementId', '11111111-1111-4111-8111-111111111111');
    await updateAnnouncement({}, form);
    expect(update).toHaveBeenCalled();
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/']);
  });
});
