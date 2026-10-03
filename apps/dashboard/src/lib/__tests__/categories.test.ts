import { describe, expect, it } from 'vitest';
import { categoryIdsInSelection, categoryParentOptions, flattenCategoryTree } from '../categories';
import type { CategoryGroupRow, CategoryRow } from '../categories';

const row = (over: Partial<CategoryRow> & Pick<CategoryRow, 'id' | 'name'>): CategoryRow => ({
  slug: over.name.toLowerCase(),
  description: null,
  metaTitle: null,
  metaDescription: null,
  depth: 2,
  parentId: null,
  parentName: null,
  sortOrder: 0,
  isPublished: true,
  productCount: 0,
  childCount: 0,
  updatedAt: '2026-09-24T10:00:00.000Z',
  ...over,
});

const group = (over: Partial<CategoryGroupRow> & Pick<CategoryGroupRow, 'id' | 'name'>): CategoryGroupRow => ({
  ...row(over),
  children: [],
  ...over,
});

describe('categoryIdsInSelection', () => {
  it('returns null for no selection, so "show everything" is distinct from an empty match set', () => {
    expect(categoryIdsInSelection([], null)).toBeNull();
  });

  it('matches a childless major category directly: it is itself the assignable id', () => {
    const flooring = group({ id: 'group-flooring', name: 'Flooring', depth: 1 });
    expect(categoryIdsInSelection([flooring], 'group-flooring')).toEqual(['group-flooring']);
  });

  it('expands a category to its whole subtree, itself included, since any level can hold products', () => {
    const stone = group({
      id: 'group-stone',
      name: 'Sintered Stone',
      depth: 1,
      children: [
        group({ id: 'range-12', name: '12mm', depth: 2, parentId: 'group-stone', children: [
          group({ id: 'sub-heixin', name: 'Heixin 12mm', depth: 3, parentId: 'range-12' }),
        ] }),
        group({ id: 'range-15', name: '15mm', depth: 2, parentId: 'group-stone' }),
      ],
    });
    expect(categoryIdsInSelection([stone], 'group-stone')).toEqual(['group-stone', 'range-12', 'sub-heixin', 'range-15']);
    expect(categoryIdsInSelection([stone], 'range-12')).toEqual(['range-12', 'sub-heixin']);
  });

  it('matches a leaf range directly, by its own id', () => {
    const range = group({ id: 'range-ivory', name: 'Limestone Ivory', parentId: 'group-stone' });
    const stone = group({ id: 'group-stone', name: 'Sintered Stone', depth: 1, children: [range] });
    expect(categoryIdsInSelection([stone], 'range-ivory')).toEqual(['range-ivory']);
  });

  it('passes an id through unchanged when it matches no row in the tree, rather than dropping the filter', () => {
    expect(categoryIdsInSelection([], 'stale-id')).toEqual(['stale-id']);
  });
});

describe('categoryParentOptions', () => {
  const stone = group({
    id: 'g-stone', name: 'Sintered Stone', depth: 1,
    children: [
      group({ id: 'r-12', name: '12mm', depth: 2, parentId: 'g-stone', parentName: 'Sintered Stone', children: [
        group({ id: 's-heixin', name: 'Heixin 12mm', depth: 3, parentId: 'r-12', parentName: '12mm' }),
      ] }),
    ],
  });
  const handles = group({ id: 'g-handles', name: 'Handles', depth: 1, children: [
    group({ id: 'r-black', name: 'Black Handles', depth: 2, parentId: 'g-handles', parentName: 'Handles' }),
  ] });

  it('offers major categories and ranges, never a sub range, naming a range after its major category', () => {
    expect(categoryParentOptions([stone, handles]).map((o) => o.name)).toEqual([
      'Sintered Stone', 'Sintered Stone › 12mm', 'Handles', 'Handles › Black Handles',
    ]);
  });

  it('never offers a category its own subtree, nor a range too deep for the level it carries', () => {
    // 12mm has Heixin under it, so under Black Handles it would be four deep.
    expect(categoryParentOptions([stone, handles], 'r-12').map((o) => o.id)).toEqual(['g-stone', 'g-handles']);
    // A leaf sub range can go under any major category or range but itself.
    expect(categoryParentOptions([stone, handles], 's-heixin').map((o) => o.id)).toEqual(['g-stone', 'r-12', 'g-handles', 'r-black']);
  });

  it('keeps a category with two levels under it at the top: no parent fits', () => {
    expect(categoryParentOptions([stone, handles], 'g-stone')).toEqual([]);
  });

  it('offers a category with one level under it only a major category', () => {
    expect(categoryParentOptions([stone, handles], 'g-handles').map((o) => o.id)).toEqual(['g-stone']);
  });

  it('flattens parents before children', () => {
    expect(flattenCategoryTree([stone]).map((r) => r.id)).toEqual(['g-stone', 'r-12', 's-heixin']);
  });
});
