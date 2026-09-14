import { describe, expect, it } from 'vitest';
import {
  imageForGroup, imagesForGroup, buildCategoryTree,
  type Category, type CatalogueProduct,
} from '../products';
import type { ProductImage } from '@beco/types';

const cat = (over: Partial<Category> & Pick<Category, 'id' | 'slug'>): Category => ({
  name: over.slug, description: null, source_path: null, parent_id: null, product_count: 0,
  ...over,
});

const img = (path: string, role: ProductImage['role'] = 'application'): ProductImage => ({
  path, alt: path, width: 1600, height: 1200, role, sort: 0,
});

const product = (
  over: Partial<CatalogueProduct> & Pick<CatalogueProduct, 'id' | 'slug' | 'category'>,
): CatalogueProduct => ({
  name: over.slug, price: null, compare_at_price: null, price_display_mode: 'poa',
  availability: 'in_stock', face_type: null, unit: null, badge: null, images: [],
  ...over,
});

/**
 * Both pull a group's own real photography for the home page's range
 * overview, `imageForGroup` one photograph and `imagesForGroup` several.
 * Grouped in one file since they share the same group-matching logic and
 * the same real failure mode: a range with nothing published, or nothing
 * photographed, must fall back rather than guess.
 */
describe('imageForGroup', () => {
  const groups = buildCategoryTree([
    cat({ id: 'g1', slug: 'sintered-stone' }),
    cat({ id: 'c1', slug: '12mm-sintered-stones', parent_id: 'g1' }),
  ]);

  it('returns the application shot of the first matching product', () => {
    const products = [
      product({
        id: 'p1', slug: 'amber-jade', category: { name: '12mm', slug: '12mm-sintered-stones' },
        images: [img('/a-slab.webp', 'slab'), img('/a-app.webp', 'application')],
      }),
    ];
    expect(imageForGroup(groups, products, 'sintered-stone')?.path).toBe('/a-app.webp');
  });

  it('falls back to the primary image when nothing is tagged application', () => {
    const products = [
      product({
        id: 'p1', slug: 'amber-jade', category: { name: '12mm', slug: '12mm-sintered-stones' },
        images: [img('/a-slab.webp', 'slab')],
      }),
    ];
    expect(imageForGroup(groups, products, 'sintered-stone')?.path).toBe('/a-slab.webp');
  });

  it('returns undefined for a group with no matching, photographed products', () => {
    const products = [
      product({ id: 'p1', slug: 'a-handle', category: { name: 'Handles', slug: 'handles' }, images: [] }),
    ];
    expect(imageForGroup(groups, products, 'sintered-stone')).toBeUndefined();
  });

  it('returns undefined for a group slug that does not exist', () => {
    expect(imageForGroup(groups, [], 'lighting')).toBeUndefined();
  });
});

describe('imagesForGroup', () => {
  const groups = buildCategoryTree([
    cat({ id: 'g1', slug: 'hardware' }),
    cat({ id: 'c1', slug: 'handles', parent_id: 'g1' }),
  ]);

  it('takes one photograph per distinct product before ever repeating one', () => {
    const products = [
      product({
        id: 'p1', slug: 'gold-handles', category: { name: 'Handles', slug: 'handles' },
        images: [img('/gold-1.webp'), img('/gold-2.webp')],
      }),
      product({
        id: 'p2', slug: 'black-handles', category: { name: 'Handles', slug: 'handles' },
        images: [img('/black-1.webp')],
      }),
    ];
    // Both distinct products lead, gold-handles' second photograph only
    // backfills afterward, once every product has had its first turn.
    const shots = imagesForGroup(groups, products, 'hardware');
    expect(shots.map((s) => s.path)).toEqual(['/gold-1.webp', '/black-1.webp', '/gold-2.webp']);
  });

  it('backfills from one deep product\'s own photographs when it is the only one in the range', () => {
    const products = [
      product({
        id: 'p1', slug: 'bamboo-panels', category: { name: 'Panels', slug: 'handles' },
        images: [img('/panel-1.webp'), img('/panel-2.webp'), img('/panel-3.webp'), img('/panel-4.webp'), img('/panel-5.webp')],
      }),
    ];
    const shots = imagesForGroup(groups, products, 'hardware', 4);
    expect(shots.map((s) => s.path)).toEqual(['/panel-1.webp', '/panel-2.webp', '/panel-3.webp', '/panel-4.webp']);
  });

  it('stops at the given limit rather than returning every photographed product', () => {
    const products = ['a', 'b', 'c'].map((slug, i) =>
      product({
        id: `p${i}`, slug, category: { name: 'Handles', slug: 'handles' },
        images: [img(`/${slug}.webp`)],
      }));
    expect(imagesForGroup(groups, products, 'hardware', 2)).toHaveLength(2);
  });

  it('returns an empty array, not undefined, for a group with nothing photographed', () => {
    expect(imagesForGroup(groups, [], 'hardware')).toEqual([]);
  });
});
