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

const maybeSingle = vi.fn();
const update = vi.fn();
const insert = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const is = vi.fn();
const from = vi.fn(() => ({
  select: (...a: unknown[]) => {
    select(...a);
    return {
      eq: (...b: unknown[]) => {
        eq(...b);
        return {
          is: (...c: unknown[]) => {
            is(...c);
            return { maybeSingle };
          },
          maybeSingle,
        };
      },
    };
  },
  insert: (payload: unknown) => {
    insert(payload);
    return { select: () => ({ maybeSingle }) };
  },
  update: (payload: unknown) => {
    update(payload);
    return {
      eq: (...b: unknown[]) => {
        eq(...b);
        return {
          eq: (...c: unknown[]) => {
            eq(...c);
            return {
              is: (...d: unknown[]) => {
                is(...d);
                return { select: () => ({ maybeSingle }) };
              },
            };
          },
        };
      },
    };
  },
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

const revalidateStorefront = vi.fn();
vi.mock('@/lib/storefront-revalidate', () => ({
  revalidateStorefront: (...a: unknown[]) => revalidateStorefront(...a),
}));

vi.mock('@/lib/product-photo', () => ({
  processProductPhoto: vi.fn(async () => {
    throw new Error('processProductPhoto should be mocked per test');
  }),
}));
vi.mock('@/lib/product-storage', () => ({
  isProductStorageConfigured: vi.fn(() => false),
  uploadProductDerivatives: vi.fn(),
  deleteProductDerivatives: vi.fn(),
}));

const { updateProduct, deleteProduct, createProduct, addProductImage, setProductPublished } = await import('../actions');

afterEach(() => {
  requirePath.mockClear();
  maybeSingle.mockReset();
  update.mockReset();
  insert.mockReset();
  revalidateStorefront.mockReset();
});

const formFrom = (over: Record<string, string> = {}) => {
  const form = new FormData();
  form.set('productId', '11111111-1111-4111-8111-111111111111');
  form.set('updatedAt', '2026-09-17T10:00:00.000Z');
  form.set('name', 'Limestone Ivory');
  form.set('slug', 'limestone-ivory');
  form.set('priceDisplayMode', 'fixed');
  form.set('price', '75000');
  form.set('compareAtPrice', '');
  form.set('availability', 'in_stock');
  form.set('badge', '');
  form.set('sortOrder', '0');
  form.set('shortDescription', 'A slab.');
  form.set('description', 'A longer slab note.');
  form.set('metaTitle', 'Limestone Ivory sintered stone');
  form.set('metaDescription', 'Stocked in Nairobi.');
  form.set('specs', JSON.stringify([{ label: 'Finish', value: 'Soft Matte' }]));
  form.set('stockQuantity', '4');
  form.set('lowStockThreshold', '1');
  form.set('unit', 'per slab');
  form.set('categoryId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  for (const [key, value] of Object.entries(over)) form.set(key, value);
  return form;
};

describe('updateProduct', () => {
  it('re-checks the session on every write', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'limestone-ivory', categories: { slug: '12mm-sintered-stones' } } })
      .mockResolvedValueOnce({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    await updateProduct({}, formFrom());
    expect(requirePath).toHaveBeenCalledWith('/products');
  });

  it('refuses a POA product that still carries a price before touching the database', async () => {
    const result = await updateProduct({}, formFrom({ priceDisplayMode: 'poa', price: '75000' }));
    expect(result.error).toMatch(/cannot carry a price/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('writes stock and SEO, then asks the storefront to rebuild that product', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'limestone-ivory', categories: { slug: '12mm-sintered-stones' } } })
      .mockResolvedValueOnce({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    const result = await updateProduct({}, formFrom({ metaTitle: 'Limestone Ivory in Nairobi', sku: 'LIM-IVORY-12' }));
    expect(result.ok).toBe('Saved.');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_title: 'Limestone Ivory in Nairobi',
        sku: 'LIM-IVORY-12',
        stock_quantity: 4,
        specs: { Finish: 'Soft Matte' },
      }),
    );
    expect(revalidateStorefront).toHaveBeenCalledWith({
      productSlug: 'limestone-ivory',
      formerSlug: 'limestone-ivory',
      categorySlug: '12mm-sintered-stones',
    });
  });

  it('names a stale lock so the editor reloads rather than overwriting', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'limestone-ivory', categories: null } })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await updateProduct({}, formFrom());
    expect(result.error).toMatch(/changed while you were editing/i);
    expect(revalidateStorefront).not.toHaveBeenCalled();
  });
});

describe('updateProduct and the published flag', () => {
  const saved = () =>
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'limestone-ivory', categories: null } })
      .mockResolvedValueOnce({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });

  it('leaves is_published alone on a plain Save, so Save can never unpublish', async () => {
    saved();
    const result = await updateProduct({}, formFrom());
    expect(result.ok).toBe('Saved.');
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('is_published');
  });

  it('writes the flag and says so when Publish saves pending edits with it', async () => {
    saved();
    const result = await updateProduct({}, formFrom({ isPublished: 'true' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_published: true }));
    expect(result.ok).toBe('Saved and published. It will appear on the website shortly.');
  });

  it('says Saved and unpublished when Unpublish saves pending edits', async () => {
    saved();
    const result = await updateProduct({}, formFrom({ isPublished: 'false' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_published: false }));
    expect(result.ok).toBe('Saved and unpublished.');
  });
});

describe('setProductPublished', () => {
  const publishForm = (published: string, updatedAt = '2026-09-17T10:00:00.000Z') => {
    const form = new FormData();
    form.set('productId', '11111111-1111-4111-8111-111111111111');
    form.set('updatedAt', updatedAt);
    form.set('published', published);
    return form;
  };

  it('checks the route permission and writes only the flag', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { slug: 'limestone-ivory', updated_at: '2026-10-07T09:00:00.000Z', categories: { slug: '12mm-sintered-stones' } },
      error: null,
    });
    const result = await setProductPublished({}, publishForm('true'));
    expect(requirePath).toHaveBeenCalledWith('/products');
    expect(update).toHaveBeenCalledWith({ is_published: true });
    expect(eq).toHaveBeenCalledWith('updated_at', '2026-09-17T10:00:00.000Z');
    expect(result).toEqual({ ok: 'Published. It will appear on the website shortly.' });
    expect(revalidateStorefront).toHaveBeenCalledWith({
      productSlug: 'limestone-ivory',
      categorySlug: '12mm-sintered-stones',
    });
  });

  it('unpublishes with its own message', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { slug: 'limestone-ivory', updated_at: '2026-10-07T09:00:00.000Z', categories: null },
      error: null,
    });
    const result = await setProductPublished({}, publishForm('false'));
    expect(update).toHaveBeenCalledWith({ is_published: false });
    expect(result).toEqual({ ok: 'Unpublished.' });
  });

  it('refuses a flag that is not true or false before touching the database', async () => {
    const result = await setProductPublished({}, publishForm('on'));
    expect(result.error).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('gives the stale-edit message when the row moved on', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { updated_at: '2026-10-07T09:30:00.000Z', deleted_at: null }, error: null });
    const result = await setProductPublished({}, publishForm('true'));
    expect(result.error).toMatch(/changed while you were editing/i);
    expect(revalidateStorefront).not.toHaveBeenCalled();
  });

  it('says permission, not stale, when the lock matched and the row still refused', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { updated_at: '2026-09-17T10:00:00.000Z', deleted_at: null }, error: null });
    const result = await setProductPublished({}, publishForm('true'));
    expect(result.error).toMatch(/do not have permission/i);
  });
});

describe('deleteProduct', () => {
  it('soft-deletes and still revalidates the storefront', async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { slug: 'limestone-ivory', categories: { slug: '12mm-sintered-stones' } } })
      .mockResolvedValueOnce({ data: { id: '11111111-1111-4111-8111-111111111111' }, error: null });
    const form = new FormData();
    form.set('productId', '11111111-1111-4111-8111-111111111111');
    form.set('updatedAt', '2026-09-17T10:00:00.000Z');
    const result = await deleteProduct({}, form);
    expect(result.ok).toMatch(/keep their line and price/i);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_published: false }));
    expect(update.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ deleted_at: expect.any(String) }));
  });
});

describe('createProduct', () => {
  it('inserts an unpublished draft and returns the slug so the editor can open', async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { slug: 'calacatta-gold', categories: { slug: '12mm-sintered-stones' } },
      error: null,
    });
    const form = new FormData();
    form.set('name', 'Calacatta Gold');
    form.set('slug', 'calacatta-gold');
    form.set('categoryId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    form.set('unit', 'per slab');
    form.set('priceDisplayMode', 'fixed');
    form.set('price', '89000');
    form.set('sku', '537 160 BLACK');
    const result = await createProduct({}, form);
    expect(requirePath).toHaveBeenCalledWith('/products');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Calacatta Gold',
        slug: 'calacatta-gold',
        sku: '537 160 BLACK',
        is_published: false,
        images: [],
      }),
    );
    expect(result.ok).toMatch(/draft created/i);
    expect(result.slug).toBe('calacatta-gold');
    expect(revalidateStorefront).toHaveBeenCalled();
  });

  it('refuses a fixed product with no price before inserting', async () => {
    const form = new FormData();
    form.set('name', 'Calacatta Gold');
    form.set('slug', 'calacatta-gold');
    form.set('categoryId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    form.set('unit', 'per slab');
    form.set('priceDisplayMode', 'fixed');
    form.set('price', '');
    const result = await createProduct({}, form);
    expect(result.error).toMatch(/must have a price/i);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('addProductImage', () => {
  it('asks for a file rather than writing an empty photograph', async () => {
    const form = new FormData();
    form.set('productId', '11111111-1111-4111-8111-111111111111');
    form.set('updatedAt', '2026-09-17T10:00:00.000Z');
    form.set('role', 'slab');
    form.set('alt', 'Limestone Ivory slab');
    const result = await addProductImage({}, form);
    expect(result.error).toMatch(/choose a photograph/i);
    expect(update).not.toHaveBeenCalled();
  });
});
