import { describe, expect, it } from 'vitest';
import { categoryIdsInSelection } from '../categories';
import type { CategoryGroupRow, CategoryRow } from '../categories';

const row = (over: Partial<CategoryRow> & Pick<CategoryRow, 'id' | 'name'>): CategoryRow => ({
  slug: over.name.toLowerCase(),
  description: null,
  metaTitle: null,
  metaDescription: null,
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

  it('matches a childless group directly: it is itself the assignable id, like Lighting', () => {
    const lighting = group({ id: 'group-lighting', name: 'Lighting' });
    expect(categoryIdsInSelection([lighting], 'group-lighting')).toEqual(['group-lighting']);
  });

  it('expands a group with children to its children, never the group id itself', () => {
    const stone = group({
      id: 'group-stone',
      name: 'Sintered Stone',
      children: [
        row({ id: 'range-ivory', name: 'Limestone Ivory', parentId: 'group-stone' }),
        row({ id: 'range-grey', name: 'Cyprus Grey', parentId: 'group-stone' }),
      ],
    });
    expect(categoryIdsInSelection([stone], 'group-stone')).toEqual(['range-ivory', 'range-grey']);
  });

  it('matches a range (a child row) directly, by its own id', () => {
    const range = row({ id: 'range-ivory', name: 'Limestone Ivory', parentId: 'group-stone' });
    const stone = group({ id: 'group-stone', name: 'Sintered Stone', children: [range] });
    expect(categoryIdsInSelection([stone], 'range-ivory')).toEqual(['range-ivory']);
  });

  it('passes an id through unchanged when it matches no row in the tree, rather than dropping the filter', () => {
    expect(categoryIdsInSelection([], 'stale-id')).toEqual(['stale-id']);
  });
});
