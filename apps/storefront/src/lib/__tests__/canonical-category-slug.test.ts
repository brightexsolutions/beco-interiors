import { afterEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const from = vi.fn();
const select = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      from(table);
      return {
        select: (columns: string) => {
          select(columns);
          return { eq: () => ({ maybeSingle }) };
        },
      };
    },
  }),
}));

const { getCanonicalCategorySlug } = await import('../products');

afterEach(() => {
  maybeSingle.mockReset();
  from.mockReset();
  select.mockReset();
});

describe('getCanonicalCategorySlug', () => {
  it('returns the range a former slug now points at, read from category_slugs through a published range', async () => {
    maybeSingle.mockResolvedValue({ data: { categories: { slug: '12mm-sintered-stones' } }, error: null });
    expect(await getCanonicalCategorySlug('heixin-12mm')).toBe('12mm-sintered-stones');
    expect(from).toHaveBeenCalledWith('category_slugs');
    // The inner join is what keeps an unpublished range from resolving: anon
    // cannot read it, so the row drops out.
    expect(select).toHaveBeenCalledWith('categories!inner(slug)');
  });

  it('reads an embedded array the same way', async () => {
    maybeSingle.mockResolvedValue({ data: { categories: [{ slug: 'handles' }] }, error: null });
    expect(await getCanonicalCategorySlug('cabinet-handles')).toBe('handles');
  });

  it('returns null when the slug is already current', async () => {
    maybeSingle.mockResolvedValue({ data: { categories: { slug: 'handles' } }, error: null });
    expect(await getCanonicalCategorySlug('handles')).toBeNull();
  });

  it('returns null when no range ever held the slug, or it points at one not published', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getCanonicalCategorySlug('missing')).toBeNull();
  });

  it('throws when Supabase errors', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } });
    await expect(getCanonicalCategorySlug('x')).rejects.toThrow(/could not resolve category slug/);
  });
});
