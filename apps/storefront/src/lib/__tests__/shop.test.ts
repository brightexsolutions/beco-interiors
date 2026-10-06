import { describe, expect, it } from 'vitest';
import type { CatalogueProduct, CategoryGroup } from '../products';
import {
  applyCatalogueFilters, finishFacetsOf, isFilteredView, legacyShopRedirect, rangeChips, rangeSummary,
} from '../shop';

const product = (over: Partial<CatalogueProduct>): CatalogueProduct =>
  ({ id: over.slug ?? 'p', name: 'Stone', slug: 'stone', price: 1000, specs: {}, images: [], ...over }) as CatalogueProduct;

const group = (over: Partial<CategoryGroup>): CategoryGroup =>
  ({ id: over.slug ?? 'g', name: 'Group', slug: 'group', description: null, source_path: null, parent_id: null, product_count: 0, total_count: 0, children: [], ...over }) as CategoryGroup;

const list = [
  product({ slug: 'a', name: 'Calacatta Gold', price: 60000, specs: { Finish: 'Polished' } }),
  product({ slug: 'b', name: 'Amber Jade', price: 65000, specs: { Finish: 'Matt' } }),
  product({ slug: 'c', name: 'Nero Marquina', price: null, specs: { Finish: 'Polished' } }),
  product({ slug: 'd', name: 'Travertine', price: 58000, specs: {} }),
];

describe('applyCatalogueFilters', () => {
  it('searches the name case insensitively and filters by finish', () => {
    expect(applyCatalogueFilters(list, { q: 'GOLD' }).map((p) => p.slug)).toEqual(['a']);
    expect(applyCatalogueFilters(list, { finish: 'Polished' }).map((p) => p.slug)).toEqual(['a', 'c']);
    expect(applyCatalogueFilters(list, { q: 'marquina', finish: 'Matt' })).toEqual([]);
  });

  it('sorts by price with unpriced items last either way, and leaves the order alone for name', () => {
    expect(applyCatalogueFilters(list, { sort: 'price-asc' }).map((p) => p.slug)).toEqual(['d', 'a', 'b', 'c']);
    expect(applyCatalogueFilters(list, { sort: 'price-desc' }).map((p) => p.slug)).toEqual(['b', 'a', 'd', 'c']);
    expect(applyCatalogueFilters(list, { sort: 'name' }).map((p) => p.slug)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('finishFacetsOf and isFilteredView', () => {
  it('counts finishes most common first and skips products with none', () => {
    expect(finishFacetsOf(list)).toEqual([
      { value: 'Polished', label: 'Polished', count: 2 },
      { value: 'Matt', label: 'Matt', count: 1 },
    ]);
  });

  it('treats the default sort and blank search as unfiltered, anything else as filtered', () => {
    expect(isFilteredView({})).toBe(false);
    expect(isFilteredView({ q: '  ', sort: 'name' })).toBe(false);
    expect(isFilteredView({ sort: 'price-asc' })).toBe(true);
    expect(isFilteredView({ finish: 'Matt' })).toBe(true);
  });
});

describe('rangeChips and rangeSummary', () => {
  const children = [group({ slug: '12mm', name: '12mm', total_count: 16 }), group({ slug: '15mm', name: '15mm', total_count: 6 })];

  it('leads with All for the open level and links each child to its own page', () => {
    const chips = rangeChips({ allHref: '/shop/sintered-stone', allCount: 24, items: children, activeSlug: null });
    expect(chips.map((c) => [c.href, c.label, c.count, c.active])).toEqual([
      ['/shop/sintered-stone', 'All', 24, true],
      ['/shop/12mm', '12mm', 16, false],
      ['/shop/15mm', '15mm', 6, false],
    ]);
  });

  it('marks the open child active and All inactive on a child page', () => {
    const chips = rangeChips({ allHref: '/shop/sintered-stone', allCount: 24, items: children, activeSlug: '15mm' });
    expect(chips.filter((c) => c.active).map((c) => c.label)).toEqual(['15mm']);
  });

  it('sums products and counts only stocked ranges', () => {
    expect(rangeSummary([group({ total_count: 24 }), group({ slug: 'x', total_count: 0 }), group({ slug: 'y', total_count: 7 })])).toEqual({ products: 31, ranges: 2 });
  });
});

describe('legacyShopRedirect', () => {
  it('sends an old range or category address to that page', () => {
    expect(legacyShopRedirect({ range: 'sintered-stone' })).toBe('/shop/sintered-stone');
    expect(legacyShopRedirect({ category: 'handles', range: 'hardware' })).toBe('/shop/handles');
  });

  it('carries search, finish and a non default sort to the flat list, and drops junk', () => {
    expect(legacyShopRedirect({ q: 'calacatta', sort: 'price-asc' })).toBe('/shop/all?q=calacatta&sort=price-asc');
    expect(legacyShopRedirect({ finish: 'Polished', sort: 'name' })).toBe('/shop/all?finish=Polished');
    expect(legacyShopRedirect({ sort: 'bogus' })).toBeNull();
    expect(legacyShopRedirect({ range: '../etc' })).toBeNull();
  });

  it('answers null for a bare /shop', () => {
    expect(legacyShopRedirect({})).toBeNull();
  });
});
