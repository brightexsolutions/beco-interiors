import { describe, expect, it } from 'vitest';
import {
  groupCategoryOptions,
  isLowStock,
  isOutOfStock,
  parseProductImages,
  productAvailabilityLabel,
  type CatalogueProduct,
  type ProductCategoryOption,
} from '../products';

const product = (over: Partial<CatalogueProduct> = {}): CatalogueProduct => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Limestone Ivory',
  slug: 'limestone-ivory',
  sku: null,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  categoryName: '12mm Sintered Stones',
  categorySlug: '12mm-sintered-stones',
  price: 75000,
  compareAtPrice: null,
  priceDisplayMode: 'fixed',
  availability: 'in_stock',
  badge: null,
  isPublished: true,
  sortOrder: 0,
  shortDescription: null,
  description: null,
  metaTitle: null,
  metaDescription: null,
  specs: [],
  images: [],
  unit: 'per slab',
  stockQuantity: 4,
  lowStockThreshold: 1,
  updatedAt: '2026-09-17T10:00:00.000Z',
  ...over,
});

describe('groupCategoryOptions', () => {
  const opt = (over: Partial<ProductCategoryOption> & Pick<ProductCategoryOption, 'id' | 'name'>): ProductCategoryOption => ({
    slug: over.name.toLowerCase(),
    parentId: null,
    ...over,
  });

  it('nests a range under its group, in the order the categories arrived', () => {
    const sintered = opt({ id: 'group-1', name: 'Sintered Stone' });
    const limestone = opt({ id: 'range-1', name: 'Limestone', parentId: 'group-1' });
    const grouped = groupCategoryOptions([sintered, limestone]);
    expect(grouped).toEqual([{ group: sintered, children: [limestone] }]);
  });

  it('keeps a childless top level category, like Lighting, as its own selectable option', () => {
    const lighting = opt({ id: 'group-2', name: 'Lighting' });
    expect(groupCategoryOptions([lighting])).toEqual([{ group: lighting, children: [] }]);
  });

  it('never lists a range at the top level: only categories with no parent are groups', () => {
    const sintered = opt({ id: 'group-1', name: 'Sintered Stone' });
    const limestone = opt({ id: 'range-1', name: 'Limestone', parentId: 'group-1' });
    const grouped = groupCategoryOptions([sintered, limestone]);
    expect(grouped.map((g) => g.group.id)).toEqual(['group-1']);
  });
});

describe('isLowStock', () => {
  it('is true only when a counted quantity is at or below the mark, and still above zero', () => {
    expect(isLowStock(1, 2)).toBe(true);
    expect(isLowStock(2, 2)).toBe(true);
    expect(isLowStock(0, 2)).toBe(false);
    expect(isLowStock(4, 2)).toBe(false);
    expect(isLowStock(null, 2)).toBe(false);
  });
});

describe('isOutOfStock', () => {
  it('treats zero as out and a missing count as uncounted', () => {
    expect(isOutOfStock(0)).toBe(true);
    expect(isOutOfStock(null)).toBe(false);
    expect(isOutOfStock(1)).toBe(false);
  });
});

describe('productAvailabilityLabel', () => {
  it('reads as out of stock when the counted quantity is zero, even if availability is in stock', () => {
    expect(productAvailabilityLabel(product({ stockQuantity: 0 }))).toBe('Out of stock');
    expect(productAvailabilityLabel(product({ stockQuantity: null }))).toBe('In stock');
  });
});

describe('parseProductImages', () => {
  it('keeps role-structured photographs and drops rows without a path', () => {
    expect(
      parseProductImages([
        { role: 'slab', path: '12mm-sintered-stones/ivory/slab-ab12', alt: 'Ivory slab', width: 1600, height: 900, sort: 1 },
        { role: 'nope', path: '', alt: 'missing' },
        { role: 'on_stand', path: '12mm-sintered-stones/ivory/on_stand-cd34', alt: 'Ivory on stand', width: 800, height: 600, sort: 0 },
      ]),
    ).toEqual([
      expect.objectContaining({ role: 'on_stand', path: '12mm-sintered-stones/ivory/on_stand-cd34', sort: 0 }),
      expect.objectContaining({ role: 'slab', sort: 1 }),
    ]);
  });
});
