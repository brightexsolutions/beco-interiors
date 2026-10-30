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

const { createPopup, updatePopup } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  insert.mockReset();
  update.mockReset();
  revalidateStorefrontPaths.mockReset();
});

const STONE = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const POPUP = '11111111-1111-4111-8111-111111111111';

const formFrom = () => {
  const form = new FormData();
  form.set('variant', 'offer');
  form.set('eyebrow', 'Live offer');
  form.set('badge', '40% off');
  form.set('title', 'Selected sintered stone');
  form.set('body', '');
  form.set('ctaLabel', 'Explore the stones');
  form.set('ctaUrl', '/shop/sintered-stone');
  form.append('productIds', STONE);
  form.append('productIds', OTHER);
  form.set('trigger', 'delay');
  form.set('triggerValue', '8');
  form.set('showAgainDays', '7');
  form.set('startsAt', '2026-11-01T08:00');
  form.set('endsAt', '2026-11-30T18:00');
  form.set('priority', '0');
  form.set('isActive', 'on');
  return form;
};

describe('createPopup', () => {
  it('re-checks the session, stores the stones in order and Nairobi instants, and busts the storefront', async () => {
    maybeSingle.mockResolvedValue({ data: { id: POPUP }, error: null });
    const result = await createPopup({}, formFrom());
    expect(requirePath).toHaveBeenCalledWith('/popups');
    expect(result).toEqual({ ok: 'Pop up saved.', popupId: POPUP });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'offer',
        title: 'Selected sintered stone',
        body: null,
        product_ids: [STONE, OTHER],
        trigger_value: 8,
        starts_at: '2026-11-01T05:00:00.000Z',
        is_active: true,
        created_by: 'admin-1',
      }),
    );
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/']);
  });

  it('stores 0 for an exit trigger, whatever number was left in the form', async () => {
    maybeSingle.mockResolvedValue({ data: { id: POPUP }, error: null });
    const form = formFrom();
    form.set('trigger', 'exit');
    form.set('triggerValue', '45');
    await createPopup({}, form);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'exit', trigger_value: 0 }));
  });

  it('stores the section for a section trigger, with no number', async () => {
    maybeSingle.mockResolvedValue({ data: { id: POPUP }, error: null });
    const form = formFrom();
    form.set('trigger', 'section');
    form.set('triggerSection', 'home-bookmatch');
    await createPopup({}, form);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: 'section', trigger_section: 'home-bookmatch', trigger_value: 0 }),
    );
  });

  it('drops a section left in the form when the trigger is not section', async () => {
    maybeSingle.mockResolvedValue({ data: { id: POPUP }, error: null });
    const form = formFrom();
    form.set('triggerSection', 'home-bookmatch');
    await createPopup({}, form);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'delay', trigger_section: null }));
  });

  it('refuses a pop up with no stone, before touching the database', async () => {
    const form = formFrom();
    form.delete('productIds');
    expect(await createPopup({}, form)).toEqual({ error: 'Pick at least one stone to show' });
    expect(insert).not.toHaveBeenCalled();
    expect(revalidateStorefrontPaths).not.toHaveBeenCalled();
  });

  it('says what the database refused, in words', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security' } });
    expect(await createPopup({}, formFrom())).toEqual({ error: 'You do not have permission to change pop ups.' });
    expect(revalidateStorefrontPaths).not.toHaveBeenCalled();
  });
});

describe('updatePopup', () => {
  it('writes by id and busts the storefront', async () => {
    maybeSingle.mockResolvedValue({ data: { id: POPUP }, error: null });
    const form = formFrom();
    form.set('popupId', POPUP);
    expect(await updatePopup({}, form)).toEqual({ ok: 'Pop up saved.' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ variant: 'offer' }));
    expect(revalidateStorefrontPaths).toHaveBeenCalledWith(['/']);
  });

  it('reports a write that matched no row, which is what RLS does to a non admin', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const form = formFrom();
    form.set('popupId', POPUP);
    expect(await updatePopup({}, form)).toEqual({ error: 'That pop up is gone, or you cannot change it.' });
    expect(revalidateStorefrontPaths).not.toHaveBeenCalled();
  });

  it('needs the id', async () => {
    expect((await updatePopup({}, formFrom())).error).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });
});
