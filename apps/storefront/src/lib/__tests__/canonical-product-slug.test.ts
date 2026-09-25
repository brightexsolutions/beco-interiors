import { afterEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

const { getCanonicalProductSlug } = await import('../products');

afterEach(() => maybeSingle.mockReset());

describe('getCanonicalProductSlug', () => {
  it('returns the current slug when a former slug is looked up', async () => {
    maybeSingle.mockResolvedValue({
      data: { products: { slug: 'limestone-ivory' } },
      error: null,
    });
    expect(await getCanonicalProductSlug('old-limestone')).toBe('limestone-ivory');
  });

  it('returns null when the slug is already current', async () => {
    maybeSingle.mockResolvedValue({
      data: { products: { slug: 'limestone-ivory' } },
      error: null,
    });
    expect(await getCanonicalProductSlug('limestone-ivory')).toBeNull();
  });

  it('returns null when no product_slugs row matches', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getCanonicalProductSlug('missing')).toBeNull();
  });

  it('throws when Supabase errors', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    await expect(getCanonicalProductSlug('x')).rejects.toThrow(/could not resolve product slug/);
  });
});
