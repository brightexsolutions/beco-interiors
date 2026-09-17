import { describe, expect, it } from 'vitest';
import { groupHitsByCategory, splitCatalogueRanges } from '../catalogue-search';
import type { CatalogueHit, CatalogueRange } from '../catalogue';

const range = (over: Partial<CatalogueRange> & Pick<CatalogueRange, 'id' | 'name'>): CatalogueRange => ({
  groupName: null,
  productCount: 0,
  ...over,
});

const hit = (over: Partial<CatalogueHit> & Pick<CatalogueHit, 'id' | 'name'>): CatalogueHit => ({
  slug: over.name.toLowerCase().replace(/\s+/g, '-'),
  price: null,
  unit: 'each',
  priceDisplayMode: 'poa',
  categoryName: null,
  ...over,
});

describe('splitCatalogueRanges', () => {
  it('keeps Lighting at the top level and groups Drive folders under Hardware', () => {
    const split = splitCatalogueRanges([
      range({ id: 'light', name: 'Lighting' }),
      range({ id: 'h1', name: 'Handles', groupName: 'Hardware', productCount: 12 }),
      range({ id: 'h2', name: 'Hinges', groupName: 'Hardware' }),
      range({ id: 's1', name: '12mm Sintered Stones', groupName: 'Sintered Stone', productCount: 24 }),
    ]);
    expect(split.ungrouped.map((item) => item.name)).toEqual(['Lighting']);
    expect(split.groups).toEqual([
      {
        name: 'Hardware',
        ranges: [
          expect.objectContaining({ name: 'Handles', productCount: 12 }),
          expect.objectContaining({ name: 'Hinges' }),
        ],
      },
      {
        name: 'Sintered Stone',
        ranges: [expect.objectContaining({ name: '12mm Sintered Stones', productCount: 24 })],
      },
    ]);
  });
});

describe('groupHitsByCategory', () => {
  it('does not dump handles under the stone list', () => {
    const groups = groupHitsByCategory([
      hit({ id: '1', name: 'Amber Jade', categoryName: '12mm Sintered Stones' }),
      hit({ id: '2', name: '537 160 Black', categoryName: 'Handles' }),
      hit({ id: '3', name: 'Jatoba Brown', categoryName: '12mm Sintered Stones' }),
    ]);
    expect(groups.map((group) => group.name)).toEqual(['12mm Sintered Stones', 'Handles']);
    expect(groups[0]?.hits.map((item) => item.name)).toEqual(['Amber Jade', 'Jatoba Brown']);
    expect(groups[1]?.hits.map((item) => item.name)).toEqual(['537 160 Black']);
  });
});
