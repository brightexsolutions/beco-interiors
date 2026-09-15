import { describe, expect, it } from 'vitest';
import { buildCategoryTree, indexableCategories, type Category } from '../products';

/**
 * The browse tree, tested as a pure function.
 *
 * The database guarantees the taxonomy is two levels deep, per migration 19,
 * so what is worth proving here is the shape the storefront renders from:
 * that a childless top level category is still a group, that counts roll up
 * rather than being read off the parent row, and that ordering survives.
 */
const cat = (over: Partial<Category> & Pick<Category, 'id' | 'slug'>): Category => ({
  name: over.slug,
  description: null,
  source_path: null,
  parent_id: null,
  product_count: 0,
  ...over,
});

describe('buildCategoryTree', () => {
  it('nests children under their parent and leaves groups at the top', () => {
    const tree = buildCategoryTree([
      cat({ id: 'g1', slug: 'sintered-stone' }),
      cat({ id: 'c1', slug: '12mm', parent_id: 'g1' }),
      cat({ id: 'c2', slug: '15mm', parent_id: 'g1' }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.slug).toBe('sintered-stone');
    expect(tree[0]!.children.map((c) => c.slug)).toEqual(['12mm', '15mm']);
  });

  it('rolls the subtree count up to the group', () => {
    const tree = buildCategoryTree([
      cat({ id: 'g1', slug: 'hardware' }),
      cat({ id: 'c1', slug: 'handles', parent_id: 'g1', product_count: 6 }),
      cat({ id: 'c2', slug: 'hinges', parent_id: 'g1', product_count: 2 }),
    ]);

    // The reader counts the range, not the row. The group's own product_count
    // is zero and showing that would say Hardware is empty when it holds 8.
    expect(tree[0]!.product_count).toBe(0);
    expect(tree[0]!.total_count).toBe(8);
  });

  it('treats a top level category with no children as a group of one', () => {
    // Lighting is a brand pillar and a single Drive folder, so it stays top
    // level rather than having a wrapper group invented for it. Callers must
    // not need a second code path for it.
    const tree = buildCategoryTree([cat({ id: 'l1', slug: 'lighting', product_count: 3 })]);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toEqual([]);
    expect(tree[0]!.total_count).toBe(3);
  });

  it('keeps the order it was given, which is sort_order from the query', () => {
    const tree = buildCategoryTree([
      cat({ id: 'g1', slug: 'stone' }),
      cat({ id: 'g2', slug: 'lighting' }),
      cat({ id: 'g3', slug: 'panels' }),
      cat({ id: 'c1', slug: 'acoustic', parent_id: 'g3' }),
    ]);

    expect(tree.map((g) => g.slug)).toEqual(['stone', 'lighting', 'panels']);
  });

  it('drops a child whose parent is not in the list rather than inventing a group', () => {
    // An unpublished parent is invisible to anon, so its children arrive
    // orphaned. Surfacing them at the top level would put "Hinges" beside
    // "Sintered Stone" as if it were a pillar of the business.
    const tree = buildCategoryTree([
      cat({ id: 'g1', slug: 'stone' }),
      cat({ id: 'c9', slug: 'orphan', parent_id: 'missing' }),
    ]);

    expect(tree.map((g) => g.slug)).toEqual(['stone']);
  });

  it('returns nothing for an empty catalogue rather than throwing', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });
});

/**
 * D27's gate, asked of the subtree.
 *
 * The rule has to be identical for the sitemap and for the robots tag, or the
 * site tells Google a page exists and then tells it not to index it. Both call
 * this, so it is worth pinning down exactly.
 */
describe('indexableCategories', () => {
  const tree = (all: Category[]) => buildCategoryTree(all);

  it('indexes a group because of what is beneath it, not what is on its row', () => {
    const out = indexableCategories(tree([
      cat({ id: 'g1', slug: 'sintered-stone' }),
      cat({ id: 'c1', slug: '12mm', parent_id: 'g1', product_count: 24 }),
    ]));

    expect(out.map((c) => c.slug)).toEqual(['sintered-stone', '12mm']);
  });

  it('keeps out a group whose ranges are all still being photographed', () => {
    // Real buying guidance on the page does not make it worth indexing when
    // there is nothing to buy. It is as thin as an empty leaf.
    const out = indexableCategories(tree([
      cat({ id: 'g1', slug: 'wall-panels' }),
      cat({ id: 'c1', slug: 'acoustic', parent_id: 'g1' }),
      cat({ id: 'c2', slug: 'bamboo', parent_id: 'g1' }),
    ]));

    expect(out).toEqual([]);
  });

  it('indexes the group but not its empty siblings', () => {
    const out = indexableCategories(tree([
      cat({ id: 'g1', slug: 'hardware' }),
      cat({ id: 'c1', slug: 'handles', parent_id: 'g1', product_count: 6 }),
      cat({ id: 'c2', slug: 'hinges', parent_id: 'g1' }),
    ]));

    expect(out.map((c) => c.slug)).toEqual(['hardware', 'handles']);
  });

  it('indexes a childless top level category on its own products', () => {
    const out = indexableCategories(tree([cat({ id: 'l1', slug: 'lighting', product_count: 3 })]));
    expect(out.map((c) => c.slug)).toEqual(['lighting']);
  });

  it('keeps out a childless top level category with nothing in it', () => {
    const out = indexableCategories(tree([cat({ id: 'l1', slug: 'lighting' })]));
    expect(out).toEqual([]);
  });
});
