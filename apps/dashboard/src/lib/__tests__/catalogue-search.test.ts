import { describe, expect, it } from 'vitest';
import { filterCatalogue, groupHitsByCategory } from '../catalogue-search';
import type { CatalogueHit } from '../catalogue';

const hit = (over: Partial<CatalogueHit> & Pick<CatalogueHit, 'id' | 'name'>): CatalogueHit => ({
  slug: over.name.toLowerCase().replace(/\s+/g, '-'),
  price: null,
  unit: 'each',
  priceDisplayMode: 'poa',
  categoryId: null,
  categoryName: null,
  parentCategoryName: null,
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

describe('filterCatalogue', () => {
  const amber = hit({
    id: '1',
    name: 'Amber Jade',
    categoryId: 'stone',
    categoryName: '12mm Sintered Stones',
    parentCategoryName: 'Sintered Stone',
  });
  const heixin = hit({
    id: '2',
    name: 'Heixin Calacatta',
    categoryId: 'heixin',
    categoryName: 'Heixin 12mm',
    parentCategoryName: '12mm Sintered Stones',
  });
  const handle = hit({
    id: '3',
    name: '537 160 Black',
    categoryId: 'handles',
    categoryName: 'Handles',
    parentCategoryName: 'Hardware',
  });
  const loose = hit({ id: '4', name: 'Loose Sample' });
  const all = [amber, heixin, handle, loose];
  const ids = (hits: CatalogueHit[]) => hits.map((item) => item.id);

  it('returns everything, in the loaded order, with no term and no range', () => {
    expect(filterCatalogue(all, { term: '  ', rangeId: null })).toBe(all);
    expect(filterCatalogue(all, { term: '', rangeId: '' })).toBe(all);
  });

  it('keeps only the products filed directly in the chosen range', () => {
    expect(ids(filterCatalogue(all, { term: '', rangeId: 'stone' }))).toEqual(['1']);
    expect(ids(filterCatalogue(all, { term: '', rangeId: 'heixin' }))).toEqual(['2']);
    expect(ids(filterCatalogue(all, { term: '', rangeId: 'nothing' }))).toEqual([]);
  });

  it('matches a product name, range name or parent range name, ignoring case and edge spaces', () => {
    expect(ids(filterCatalogue(all, { term: 'AMBER', rangeId: null }))).toEqual(['1']);
    expect(ids(filterCatalogue(all, { term: 'handles', rangeId: null }))).toEqual(['3']);
    expect(ids(filterCatalogue(all, { term: 'hardware', rangeId: null }))).toEqual(['3']);
    expect(ids(filterCatalogue(all, { term: ' sintered ', rangeId: null }))).toEqual(['1', '2']);
    expect(ids(filterCatalogue(all, { term: 'sample', rangeId: null }))).toEqual(['4']);
  });

  it('matches only the product name inside a range, as the server search did', () => {
    expect(ids(filterCatalogue(all, { term: 'sintered', rangeId: 'stone' }))).toEqual([]);
    expect(ids(filterCatalogue(all, { term: 'jade', rangeId: 'stone' }))).toEqual(['1']);
    expect(ids(filterCatalogue(all, { term: 'black', rangeId: 'stone' }))).toEqual([]);
  });

  it('treats filter characters as plain text, not a pattern', () => {
    expect(ids(filterCatalogue(all, { term: '%', rangeId: null }))).toEqual([]);
    expect(ids(filterCatalogue([hit({ id: '5', name: '50% off' })], { term: '0%', rangeId: null }))).toEqual(['5']);
  });
});
