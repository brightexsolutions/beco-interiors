import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProductImage } from '@beco/types';

// popups -> select().order().order().limit(); products -> select().in()
const limit = vi.fn();
const inMock = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) =>
      table === 'popups'
        ? { select: () => ({ order: () => ({ order: () => ({ limit }) }) }) }
        : { select: () => ({ in: inMock }) },
  }),
}));

const { getLivePopups, pickPopupImage, toLivePopup } = await import('../popups');

afterEach(() => {
  limit.mockReset();
  inMock.mockReset();
});

const img = (path: string, role: ProductImage['role'], sort = 0): ProductImage => ({
  path, alt: path, role, sort, width: 1600, height: 1000,
});

const row = {
  id: 'p1', variant: 'offer' as const, eyebrow: 'Live offer', badge: '40% off', title: 'Selected stone',
  body: null, cta_label: 'Explore', cta_url: '/shop', product_ids: ['a', 'gone', 'b'],
  trigger: 'delay' as const, trigger_value: 8, trigger_section: null, show_again_days: 7,
};
const products = [
  { id: 'b', images: [img('b/room', 'application'), img('b/slab', 'slab')] },
  { id: 'a', images: [img('a/slab', 'slab'), img('a/room', 'application')] },
];

describe('pickPopupImage', () => {
  it('gives the split look the room and the offer strip the slab', () => {
    expect(pickPopupImage(products[0]!.images, 'split')?.path).toBe('b/room');
    expect(pickPopupImage(products[0]!.images, 'offer')?.path).toBe('b/slab');
  });

  it('falls back to whatever the stone has, and to nothing when it has none', () => {
    expect(pickPopupImage([img('x/stand', 'on_stand')], 'split')?.path).toBe('x/stand');
    expect(pickPopupImage([], 'offer')).toBeUndefined();
  });
});

describe('toLivePopup', () => {
  it('keeps the chosen order and drops a stone that is gone', () => {
    const popup = toLivePopup(row, products);
    expect(popup?.images.map((i) => i.path)).toEqual(['a/slab', 'b/slab']);
    expect(popup?.cta).toEqual({ label: 'Explore', href: '/shop' });
  });

  it('shows one photograph in the split look', () => {
    expect(toLivePopup({ ...row, variant: 'split' }, products)?.images.map((i) => i.path)).toEqual(['a/room']);
  });

  it('is nothing when every stone has gone', () => {
    expect(toLivePopup(row, [])).toBeNull();
  });

  it('draws no button without both halves of it', () => {
    expect(toLivePopup({ ...row, cta_url: null }, products)?.cta).toBeNull();
  });
});

describe('getLivePopups', () => {
  it('reads every live row with its stones, in priority order', async () => {
    const second = { ...row, id: 'p2', trigger: 'section' as const, trigger_section: 'home-showroom' as const, product_ids: ['b'] };
    limit.mockResolvedValue({ data: [row, second], error: null });
    inMock.mockResolvedValue({ data: products, error: null });
    const popups = await getLivePopups();
    expect(popups.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(popups[1]?.triggerSection).toBe('home-showroom');
  });

  it('drops a row whose stones have all gone, and keeps the rest', async () => {
    limit.mockResolvedValue({ data: [row, { ...row, id: 'p3', product_ids: ['gone'] }], error: null });
    inMock.mockResolvedValue({ data: products, error: null });
    expect((await getLivePopups()).map((p) => p.id)).toEqual(['p1']);
  });

  it('is empty, never a throw, when nothing is live or a read fails', async () => {
    limit.mockResolvedValue({ data: [], error: null });
    expect(await getLivePopups()).toEqual([]);
    limit.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect(await getLivePopups()).toEqual([]);
    limit.mockResolvedValue({ data: [row], error: null });
    inMock.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect(await getLivePopups()).toEqual([]);
  });
});
