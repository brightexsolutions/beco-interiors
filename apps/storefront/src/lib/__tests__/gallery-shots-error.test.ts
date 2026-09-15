import { afterEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: orderMock }) }),
  }),
}));

const { getPublishedProducts, getGalleryShots } = await import('../products');

afterEach(() => orderMock.mockReset());

describe('gallery reads on a Supabase failure', () => {
  it('getPublishedProducts throws rather than returning a silent empty catalogue', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'connection lost' } });
    await expect(getPublishedProducts()).rejects.toThrow(/could not load products/);
  });

  it('getGalleryShots propagates that error, so /gallery hits the error boundary', async () => {
    // The photographs are the whole content of the page. A failed read is the
    // page failing, and error.tsx with its retry is the honest response,
    // not a "we are still photographing" empty state that would be a lie.
    orderMock.mockResolvedValue({ data: null, error: { message: 'connection lost' } });
    await expect(getGalleryShots()).rejects.toThrow(/could not load products/);
  });
});
