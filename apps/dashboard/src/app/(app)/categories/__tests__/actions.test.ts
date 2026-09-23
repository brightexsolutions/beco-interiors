import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'pm-1',
  email: 'pm@beco.co.ke',
  fullName: 'P Manager',
  role: 'beco_product_manager' as const,
  isActive: true,
  mustChangePassword: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: Parameters<typeof requirePath>) => requirePath(...a) }));

// A tiny chainable stand-in for the supabase-js query builder. `maybeSingle`
// and `countResults` are each drained in call order, mirroring how the
// products actions test mocks a sequence of round trips with
// mockResolvedValueOnce rather than modelling the real client.
const maybeSingle = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const del = vi.fn();
const countResults: { count: number | null; error: null }[] = [];
let countIndex = 0;

const mutateEq = () => ({
  eq: () => ({
    eq: () => ({
      select: () => ({ maybeSingle }),
    }),
  }),
});

const from = vi.fn(() => ({
  select: (...args: unknown[]) => {
    const isCount = typeof args[1] === 'object' && args[1] !== null && 'count' in (args[1] as object);
    if (isCount) {
      return { eq: async () => countResults[countIndex++] ?? { count: 0, error: null } };
    }
    return { eq: () => ({ maybeSingle }) };
  },
  insert: (payload: unknown) => {
    insert(payload);
    return { select: () => ({ maybeSingle }) };
  },
  update: (payload: unknown) => {
    update(payload);
    return mutateEq();
  },
  delete: () => {
    del();
    return mutateEq();
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const revalidateCategory = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateCategory: (...a: unknown[]) => revalidateCategory(...a),
}));

const { createCategory, updateCategory, deleteCategory } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  insert.mockReset();
  update.mockReset();
  del.mockReset();
  revalidateCategory.mockReset();
  countResults.length = 0;
  countIndex = 0;
});

const CAT_ID = '11111111-1111-4111-8111-111111111111';
const PARENT_ID = '22222222-2222-4222-8222-222222222222';

describe('createCategory', () => {
  it('inserts an unpublished draft and returns the slug so the editor can open', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { slug: 'wall-panels' }, error: null });
    const form = new FormData();
    form.set('name', 'Wall Panels');
    form.set('slug', 'wall-panels');
    form.set('parentId', '');
    const result = await createCategory({}, form);
    expect(requirePath).toHaveBeenCalledWith('/categories');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Wall Panels', slug: 'wall-panels', parent_id: null, is_published: false }),
    );
    expect(result.ok).toMatch(/draft created/i);
    expect(result.slug).toBe('wall-panels');
    expect(revalidateCategory).toHaveBeenCalledWith({ categorySlug: 'wall-panels', parentSlug: null });
  });

  it('looks up the parent slug for revalidation when the range sits under a group', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'bamboo-veneer' }, error: null })
      .mockResolvedValueOnce({ data: { slug: 'wall-panels' } });
    const form = new FormData();
    form.set('name', 'Bamboo Veneer');
    form.set('slug', 'bamboo-veneer');
    form.set('parentId', PARENT_ID);
    const result = await createCategory({}, form);
    expect(result.slug).toBe('bamboo-veneer');
    expect(revalidateCategory).toHaveBeenCalledWith({ categorySlug: 'bamboo-veneer', parentSlug: 'wall-panels' });
  });

  it('refuses a slug with a space before touching the database', async () => {
    const form = new FormData();
    form.set('name', 'Wall Panels');
    form.set('slug', 'wall panels');
    form.set('parentId', '');
    const result = await createCategory({}, form);
    expect(result.error).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('updateCategory', () => {
  const formFrom = (over: Record<string, string> = {}) => {
    const form = new FormData();
    form.set('categoryId', CAT_ID);
    form.set('updatedAt', '2026-09-23T10:00:00.000Z');
    form.set('name', 'Sintered Stone');
    form.set('slug', 'sintered-stone');
    form.set('parentId', '');
    form.set('description', 'Large format slabs.');
    form.set('metaTitle', '');
    form.set('metaDescription', '');
    form.set('isPublished', 'on');
    form.set('sortOrder', '10');
    for (const [key, value] of Object.entries(over)) form.set(key, value);
    return form;
  };

  it('re-checks the session on every write', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'sintered-stone', parent_id: null } })
      .mockResolvedValueOnce({ data: { slug: 'sintered-stone' }, error: null });
    await updateCategory({}, formFrom());
    expect(requirePath).toHaveBeenCalledWith('/categories');
  });

  it('saves and busts the storefront for the current and former slug', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'sintered-stones', parent_id: null } })
      .mockResolvedValueOnce({ data: { slug: 'sintered-stone' }, error: null });
    const result = await updateCategory({}, formFrom());
    expect(result.ok).toBe('Saved.');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sintered Stone', slug: 'sintered-stone', is_published: true, sort_order: 10 }),
    );
    expect(revalidateCategory).toHaveBeenCalledWith({
      categorySlug: 'sintered-stone',
      parentSlug: null,
      formerSlug: 'sintered-stones',
    });
  });

  it('names a stale lock so the editor reloads rather than overwriting', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'sintered-stone', parent_id: null } })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await updateCategory({}, formFrom());
    expect(result.error).toMatch(/changed while you were editing/i);
    expect(revalidateCategory).not.toHaveBeenCalled();
  });

  it('refuses a missing lock token before touching the database', async () => {
    const result = await updateCategory({}, formFrom({ updatedAt: '' }));
    expect(result.error).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });
});

describe('deleteCategory', () => {
  const form = () => {
    const f = new FormData();
    f.set('categoryId', CAT_ID);
    f.set('updatedAt', '2026-09-23T10:00:00.000Z');
    return f;
  };

  it('deletes an empty range and revalidates the storefront', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'gone-range', parent_id: null } })
      .mockResolvedValueOnce({ data: { id: CAT_ID }, error: null });
    countResults.push({ count: 0, error: null }, { count: 0, error: null });
    const result = await deleteCategory({}, form());
    expect(result.ok).toBe('Removed.');
    expect(del).toHaveBeenCalled();
    expect(revalidateCategory).toHaveBeenCalledWith({ categorySlug: 'gone-range', parentSlug: null });
  });

  it('refuses to delete a group that still has ranges under it, and never issues the delete', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { slug: 'sintered-stone', parent_id: null } });
    countResults.push({ count: 0, error: null }, { count: 3, error: null });
    const result = await deleteCategory({}, form());
    expect(result.error).toMatch(/ranges.*under it/i);
    expect(del).not.toHaveBeenCalled();
    expect(revalidateCategory).not.toHaveBeenCalled();
  });

  it('refuses to delete a range that still has products filed under it', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { slug: 'limestone', parent_id: PARENT_ID } });
    countResults.push({ count: 5, error: null }, { count: 0, error: null });
    const result = await deleteCategory({}, form());
    expect(result.error).toMatch(/products.*filed under this range/i);
    expect(del).not.toHaveBeenCalled();
  });
});
