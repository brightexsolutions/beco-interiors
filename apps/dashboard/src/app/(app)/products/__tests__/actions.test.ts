import { afterEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({
  userId: 'pm-1',
  email: 'pm@beco.co.ke',
  fullName: 'P Manager',
  role: 'beco_product_manager' as const,
  isActive: true,
  mustChangePassword: false,
}));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...a) }));

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

const { updateProduct, deleteProduct, createProduct, addProductImage } = await import('../actions');

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
  form.set('isPublished', 'on');
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
