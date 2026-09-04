import { describe, expect, it } from 'vitest';
import { blogCategoryFacets } from '../blog';

describe('blogCategoryFacets', () => {
  it('counts posts per category, alphabetically', () => {
    const facets = blogCategoryFacets([
      { category: 'Guides' }, { category: 'Materials' }, { category: 'Guides' },
    ]);
    expect(facets).toEqual([
      { name: 'Guides', count: 2 },
      { name: 'Materials', count: 1 },
    ]);
  });

  it('ignores a post with no category rather than counting it as one', () => {
    const facets = blogCategoryFacets([{ category: 'Guides' }, { category: null }]);
    expect(facets).toEqual([{ name: 'Guides', count: 1 }]);
  });

  it('counts against the FULL list given, never dropping to zero under a filter applied elsewhere', () => {
    // The caller is responsible for passing the unfiltered list, the same
    // rule the shop's own facet counts follow: this function just counts
    // whatever it is handed.
    const all = [{ category: 'Guides' }, { category: 'Materials' }];
    expect(blogCategoryFacets(all)).toHaveLength(2);
  });

  it('returns an empty list for no posts', () => {
    expect(blogCategoryFacets([])).toEqual([]);
  });
});
