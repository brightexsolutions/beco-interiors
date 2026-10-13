import { describe, expect, it } from 'vitest';
import {
  createProductSchema,
  deleteProductSchema,
  setProductPublishedSchema,
  isValidStockAmount,
  parseProductSizes,
  sizesFromForm,
  slugifyProductName,
  specsFromRecord,
  specsToRecord,
  stockStepFor,
  updateProductSchema,
  lowestSizePrice,
  priceIsFrom,
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

  it('reads an explicit published flag from form strings', () => {
    const parsed = updateProductSchema.safeParse({ ...base, isPublished: 'on' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.isPublished).toBe(true);
    const off = updateProductSchema.safeParse({ ...base, isPublished: 'false' });
    expect(off.success).toBe(true);
    if (off.success) expect(off.data.isPublished).toBe(false);
  });

  it('leaves the published flag undefined when the form does not send one, so Save cannot unpublish', () => {
    for (const isPublished of [undefined, null, '']) {
      const parsed = updateProductSchema.safeParse({ ...base, isPublished });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.isPublished).toBeUndefined();
    }
  });
});

describe('setProductPublishedSchema', () => {
  const lock = { productId: base.productId, updatedAt: '2026-10-07T09:00:00.000Z' };

  it('reads true and false from form strings', () => {
    const on = setProductPublishedSchema.safeParse({ ...lock, published: 'true' });
    const off = setProductPublishedSchema.safeParse({ ...lock, published: 'false' });
    expect(on.success && on.data.published).toBe(true);
    expect(off.success && off.data.published).toBe(false);
  });

  it('refuses anything that is not an explicit true or false', () => {
    for (const published of ['', 'on', 'yes', null, undefined, 1]) {
      expect(setProductPublishedSchema.safeParse({ ...lock, published }).success).toBe(false);
    }
  });

  it('needs a uuid and the lock token', () => {
    expect(setProductPublishedSchema.safeParse({ ...lock, productId: 'nope', published: 'true' }).success).toBe(false);
    expect(setProductPublishedSchema.safeParse({ ...lock, updatedAt: '', published: 'true' }).success).toBe(false);
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

describe('product sizes, D137', () => {
  it('accepts a list of sizes, each with an optional price and code, and keeps their order', () => {
    const parsed = updateProductSchema.safeParse({
      ...base,
      sizes: [
        { label: '96mm', price: '850', sku: 'HT-96' },
        { label: '128mm', price: '', sku: '' },
        { label: '160mm', price: null, sku: null },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sizes).toEqual([
        { label: '96mm', price: 850, sku: 'HT-96' },
        { label: '128mm', price: null, sku: null },
        { label: '160mm', price: null, sku: null },
      ]);
    }
  });

  it('defaults to no sizes, refuses a duplicate label and a zero price', () => {
    const none = updateProductSchema.safeParse(base);
    expect(none.success).toBe(true);
    if (none.success) expect(none.data.sizes).toEqual([]);

    const twice = updateProductSchema.safeParse({ ...base, sizes: [{ label: '96mm' }, { label: '96MM' }] });
    expect(twice.success).toBe(false);
    if (!twice.success) expect(twice.error.issues[0]?.message).toBe('Size 96MM is listed twice');

    const zero = updateProductSchema.safeParse({ ...base, sizes: [{ label: '96mm', price: '0' }] });
    expect(zero.success).toBe(false);
  });

  it('drops an empty editor row before validation, and reads the stored column defensively', () => {
    expect(sizesFromForm(JSON.stringify([{ label: ' ', price: null }, { label: '128mm', price: 950 }]))).toEqual([
      { label: '128mm', price: 950 },
    ]);
    expect(sizesFromForm('not json')).toEqual([]);
    expect(sizesFromForm(undefined)).toEqual([]);
    expect(parseProductSizes([{ label: '128mm', price: 950, sku: ' A1 ' }, { label: '', price: 1 }, 'junk', { label: '160mm', price: -4 }])).toEqual([
      { label: '128mm', price: 950, sku: 'A1' },
      { label: '160mm', price: null, sku: null },
    ]);
    expect(parseProductSizes('x')).toEqual([]);
  });
});

describe('a product priced by its sizes, D152', () => {
  const handle = {
    ...base,
    name: 'HT-3916 Black Handles',
    slug: 'ht-3916-black-handles',
    unit: 'per piece',
    stockQuantity: null,
    lowStockThreshold: null,
    price: '',
    sizes: [
      { label: '600MM', price: 255, sku: null },
      { label: '700MM', price: 320, sku: null },
      { label: '1000MM', price: 490, sku: null },
    ],
  };

  it('saves a fixed price product with no price of its own when every size is priced, taking the lowest', () => {
    const parsed = updateProductSchema.safeParse(handle);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price).toBe(255);
  });

  it('keeps a price typed on the product rather than the lowest size', () => {
    const parsed = updateProductSchema.safeParse({ ...handle, price: 300 });
    expect(parsed.success && parsed.data.price).toBe(300);
  });

  it('still asks for a price when one size has none, since that size would take the product price', () => {
    const parsed = updateProductSchema.safeParse({
      ...handle,
      sizes: [...handle.sizes, { label: '1200MM', price: '', sku: null }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('Give the product a price, or give every size its own');
  });

  it('still asks for a price on a product with no sizes', () => {
    const parsed = updateProductSchema.safeParse({ ...handle, sizes: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('A fixed price product must have a price');
  });

  it('leaves a price on application product without a price', () => {
    const parsed = updateProductSchema.safeParse({ ...handle, priceDisplayMode: 'poa' });
    expect(parsed.success && parsed.data.price).toBeNull();
  });

  it('measures a compare-at price against the lowest size price', () => {
    expect(updateProductSchema.safeParse({ ...handle, compareAtPrice: 300 }).success).toBe(true);
    expect(updateProductSchema.safeParse({ ...handle, compareAtPrice: 200 }).success).toBe(false);
  });
});

describe('lowestSizePrice', () => {
  it('is the lowest size price only when every size has one', () => {
    expect(lowestSizePrice([{ price: 490 }, { price: 255 }])).toBe(255);
    expect(lowestSizePrice([{ price: 490 }, { price: null }])).toBeNull();
    expect(lowestSizePrice([])).toBeNull();
  });
});

describe('priceIsFrom', () => {
  it('is true when the sizes come to two or more prices, an unpriced size taking the product price', () => {
    expect(priceIsFrom(255, [{ price: 255 }, { price: 490 }])).toBe(true);
    expect(priceIsFrom(255, [{ price: null }, { price: 490 }])).toBe(true);
    expect(priceIsFrom(255, [{ price: null }, { price: 255 }])).toBe(false);
    expect(priceIsFrom(255, [])).toBe(false);
    expect(priceIsFrom(null, [{ price: null }])).toBe(false);
  });
});
