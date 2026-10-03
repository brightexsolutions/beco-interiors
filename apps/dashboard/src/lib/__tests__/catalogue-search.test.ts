import { describe, expect, it } from 'vitest';
import { groupHitsByCategory } from '../catalogue-search';
import type { CatalogueHit } from '../catalogue';

const hit = (over: Partial<CatalogueHit> & Pick<CatalogueHit, 'id' | 'name'>): CatalogueHit => ({
  slug: over.name.toLowerCase().replace(/\s+/g, '-'),
  price: null,
  unit: 'each',
  priceDisplayMode: 'poa',
  categoryName: null,
  thumb: null,
  ...over,
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
