import { describe, expect, it } from 'vitest';
import {
  createProductSchema,
  deleteProductSchema,
  isValidStockAmount,
  slugifyProductName,
  specsFromRecord,
  specsToRecord,
  stockStepFor,
  updateProductSchema,
} from '../dashboard-product';

const base = {
  productId: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-09-17T10:00:00.000Z',
  name: 'Limestone Ivory',
  slug: 'limestone-ivory',
  priceDisplayMode: 'fixed' as const,
  price: 75000,
  compareAtPrice: null,
  availability: 'in_stock' as const,
  badge: null,
  isPublished: true,
  sortOrder: 0,
  shortDescription: 'A soft ivory slab.',
  description: 'A soft ivory slab for kitchens.',
  metaTitle: 'Limestone Ivory sintered stone',
  metaDescription: 'Stocked in Nairobi.',
  specs: [{ label: 'Finish', value: 'Soft Matte' }],
  stockQuantity: 4,
  lowStockThreshold: 1,
  unit: 'per slab',
};

describe('stockStepFor', () => {
  it('steps a slab by half and everything else by one', () => {
    expect(stockStepFor('per slab')).toBe(0.5);
    expect(stockStepFor('per piece')).toBe(1);
    expect(stockStepFor(null)).toBe(1);
  });
});

describe('isValidStockAmount', () => {
  it('allows zero, which is out of stock, and a half slab', () => {
    expect(isValidStockAmount(0, 'per slab')).toBe(true);
    expect(isValidStockAmount(1.5, 'per slab')).toBe(true);
    expect(isValidStockAmount(1.3, 'per slab')).toBe(false);
  });

  it('refuses a half unit on a handle', () => {
    expect(isValidStockAmount(0.5, 'per piece')).toBe(false);
    expect(isValidStockAmount(3, 'per piece')).toBe(true);
  });

  it('refuses a negative count before the database sees it', () => {
    expect(isValidStockAmount(-1, 'per slab')).toBe(false);
  });
});

describe('updateProductSchema', () => {
  it('accepts a priced slab with a half-unit stock count', () => {
    expect(updateProductSchema.safeParse(base).success).toBe(true);
  });

  it('treats an empty price as POA, and refuses a POA product that still has a price', () => {
    expect(
      updateProductSchema.safeParse({ ...base, priceDisplayMode: 'poa', price: '' }).success,
    ).toBe(true);
    const pricedPoa = updateProductSchema.safeParse({ ...base, priceDisplayMode: 'poa', price: 75000 });
    expect(pricedPoa.success).toBe(false);
  });

  it('requires a price on a fixed product', () => {
    const parsed = updateProductSchema.safeParse({ ...base, price: '' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toMatch(/must have a price/i);
    }
  });

  it('refuses a half-unit stock count on a non-slab', () => {
    const parsed = updateProductSchema.safeParse({
      ...base,
      unit: 'per piece',
      stockQuantity: 0.5,
    });
    expect(parsed.success).toBe(false);
  });

  it('treats a blank stock field as uncounted, not zero', () => {
    const parsed = updateProductSchema.safeParse({ ...base, stockQuantity: '', lowStockThreshold: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.stockQuantity).toBeNull();
      expect(parsed.data.lowStockThreshold).toBeNull();
    }
  });

  it('accepts a handle code as the SKU, and treats a blank as none', () => {
    const parsed = updateProductSchema.safeParse({ ...base, sku: '  537  160  BLACK  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sku).toBe('537 160 BLACK');
    const blank = updateProductSchema.safeParse({ ...base, sku: '   ' });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.sku).toBeNull();
  });

  it('reads the published checkbox from form strings', () => {
    const parsed = updateProductSchema.safeParse({ ...base, isPublished: 'on' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isPublished).toBe(true);
  });
});

describe('deleteProductSchema', () => {
  it('needs the lock token, so a stale delete is refused later by the row', () => {
    expect(deleteProductSchema.safeParse({ productId: base.productId }).success).toBe(false);
    expect(
      deleteProductSchema.safeParse({ productId: base.productId, updatedAt: base.updatedAt }).success,
    ).toBe(true);
  });
});

describe('slugifyProductName', () => {
  it('turns a stone name into a lowercase hyphenated slug', () => {
    expect(slugifyProductName('Limestone Ivory')).toBe('limestone-ivory');
    expect(slugifyProductName('  Calacatta  Gold  ')).toBe('calacatta-gold');
  });
});

describe('createProductSchema', () => {
  const create = {
    name: 'Calacatta Gold',
    slug: 'calacatta-gold',
    categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    unit: 'per slab' as const,
    priceDisplayMode: 'fixed' as const,
    price: 89000,
  };

  it('accepts an unpublished draft payload', () => {
    expect(createProductSchema.safeParse(create).success).toBe(true);
  });

  it('keeps an optional SKU on a draft, including a handle code', () => {
    const parsed = createProductSchema.safeParse({ ...create, sku: '6832 64 BLACK' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sku).toBe('6832 64 BLACK');
    expect(createProductSchema.safeParse({ ...create, sku: '' }).success).toBe(true);
  });

  it('still requires a price on a fixed product', () => {
    const parsed = createProductSchema.safeParse({ ...create, price: '' });
    expect(parsed.success).toBe(false);
  });
});

describe('specs round trip', () => {
  it('drops blank rows rather than writing empty keys', () => {
    expect(specsToRecord([{ label: 'Finish', value: 'Matte' }, { label: '', value: 'x' }])).toEqual({
      Finish: 'Matte',
    });
  });

  it('reads the object shape the catalogue actually stores', () => {
    expect(specsFromRecord({ Finish: 'Matte', Thickness: '12mm' })).toEqual([
      { label: 'Finish', value: 'Matte' },
      { label: 'Thickness', value: '12mm' },
    ]);
  });
});
