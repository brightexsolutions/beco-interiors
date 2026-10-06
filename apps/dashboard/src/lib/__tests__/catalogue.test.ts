import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePath = vi.fn(async () => ({ userId: 'u', role: 'beco_sales' }));
vi.mock('@/lib/session', () => ({ requirePath: (...a: unknown[]) => requirePath(...(a as [])) }));

// Two queries, one per table. Each builder records its calls and resolves
// to whatever the test put in `results`.
const results: Record<string, { data: unknown; error: { message: string } | null }> = {};
const calls: Record<string, [string, unknown[]][]> = {};
const builder = (table: string) => {
  const record = (method: string) =>
    (...args: unknown[]) => {
      (calls[table] ??= []).push([method, args]);
      return chain;
    };
  const chain = {
    select: record('select'),
    order: record('order'),
    is: record('is'),
    eq: record('eq'),
    then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve(results[table]).then(resolve, reject),
  };
  return chain;
};
const from = vi.fn((table: string) => builder(table));
vi.mock('@/lib/supabase', () => ({ getSupabase: async () => ({ from }) }));

process.env.NEXT_PUBLIC_IMAGE_HOST = 'https://img.test';
const { loadPickerCatalogue } = await import('../catalogue');

const categories = [
  { id: 'sintered', name: 'Sintered Stone', sort_order: 1, parent_id: null, is_published: true },
  { id: 'stone', name: '12mm Sintered Stones', sort_order: 2, parent_id: 'sintered', is_published: true },
  { id: 'heixin', name: 'Heixin 12mm', sort_order: 3, parent_id: 'stone', is_published: true },
  { id: 'hardware', name: 'Hardware', sort_order: 10, parent_id: null, is_published: true },
  { id: 'handles', name: 'Handles', sort_order: 11, parent_id: 'hardware', is_published: true },
  { id: 'knobs', name: 'Knobs', sort_order: 12, parent_id: 'hardware', is_published: true },
  { id: 'hidden', name: 'Hidden', sort_order: 13, parent_id: 'hardware', is_published: false },
];

const blur = 'data:image/webp;base64,' + 'A'.repeat(200);
const products = [
  {
    id: 'p-handle',
    name: '537 160 Black',
    slug: '537-160-black',
    price: 450,
    unit: 'each',
    price_display_mode: 'fixed',
    category_id: 'handles',
    images: [],
  },
  {
    id: 'p-jatoba',
    name: 'Jatoba Brown',
    slug: 'jatoba-brown',
    price: null,
    unit: 'per slab',
    price_display_mode: 'poa',
    category_id: 'stone',
    images: [
      { role: 'slab', path: 'stone/jatoba/slab-1', alt: 'Jatoba', width: 1, height: 1, sort: 1, blur },
      { role: 'slab', path: 'stone/jatoba/slab-0', alt: 'Jatoba', width: 1, height: 1, sort: 0, blur },
    ],
  },
  {
    id: 'p-amber',
    name: 'Amber Jade',
    slug: 'amber-jade',
    price: 65000,
    unit: 'per slab',
    price_display_mode: 'fixed',
    category_id: 'stone',
    images: null,
  },
  {
    id: 'p-heixin',
    name: 'Heixin Calacatta',
    slug: 'heixin-calacatta',
    price: 70000,
    unit: 'per slab',
    price_display_mode: 'fixed',
    category_id: 'heixin',
    images: [],
  },
  {
    id: 'p-loose',
    name: 'Loose Sample',
    slug: 'loose-sample',
    price: null,
    unit: null,
    price_display_mode: 'poa',
    category_id: null,
    images: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(calls)) delete calls[key];
  results.categories = { data: categories, error: null };
  results.products = { data: products, error: null };
});

describe('loadPickerCatalogue', () => {
  it('gates on the Quotes route before reading anything', async () => {
    requirePath.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(loadPickerCatalogue()).rejects.toThrow('NEXT_REDIRECT');
    expect(requirePath).toHaveBeenCalledWith('/quotes');
    expect(from).not.toHaveBeenCalled();
  });

  it('reads only published, live products, through the session client', async () => {
    await loadPickerCatalogue();
    expect(calls.products).toEqual(
      expect.arrayContaining([
        ['is', ['deleted_at', null]],
        ['eq', ['is_published', true]],
      ]),
    );
    // One query each, no per range or per keystroke follow up.
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('returns slim rows: the first photograph by sort as a thumbnail, never the blur', async () => {
    const { products: hits } = await loadPickerCatalogue();
    const jatoba = hits.find((item) => item.id === 'p-jatoba')!;
    expect(jatoba).toEqual({
      id: 'p-jatoba',
      name: 'Jatoba Brown',
      slug: 'jatoba-brown',
      price: null,
      unit: 'per slab',
      priceDisplayMode: 'poa',
      categoryId: 'stone',
      categoryName: '12mm Sintered Stones',
      parentCategoryName: 'Sintered Stone',
      thumb: 'https://img.test/stone/jatoba/slab-0-400.webp',
    });
    expect(JSON.stringify(hits)).not.toContain('base64');
    expect(hits.find((item) => item.id === 'p-amber')!.thumb).toBeNull();
  });

  it('orders by range name then product name, uncategorised last', async () => {
    const { products: hits } = await loadPickerCatalogue();
    expect(hits.map((item) => item.name)).toEqual([
      'Amber Jade',
      'Jatoba Brown',
      '537 160 Black',
      'Heixin Calacatta',
      'Loose Sample',
    ]);
  });

  it('lists published ranges in catalogue order, counting products filed directly in each', async () => {
    const { ranges } = await loadPickerCatalogue();
    expect(ranges).toEqual([
      { id: 'stone', name: '12mm Sintered Stones', groupName: 'Sintered Stone', productCount: 2 },
      { id: 'heixin', name: 'Heixin 12mm', groupName: '12mm Sintered Stones', productCount: 1 },
      { id: 'handles', name: 'Handles', groupName: 'Hardware', productCount: 1 },
      { id: 'knobs', name: 'Knobs', groupName: 'Hardware', productCount: 0 },
    ]);
  });

  it('throws a plain sentence when either query fails, so the picker can offer a retry', async () => {
    results.products = { data: null, error: { message: 'boom' } };
    await expect(loadPickerCatalogue()).rejects.toThrow('Could not load the catalogue: boom');
    results.products = { data: products, error: null };
    results.categories = { data: null, error: { message: 'nope' } };
    await expect(loadPickerCatalogue()).rejects.toThrow('Could not load the catalogue: nope');
  });

  it('returns an empty catalogue rather than failing when nothing is published', async () => {
    results.products = { data: [], error: null };
    const { products: hits, ranges } = await loadPickerCatalogue();
    expect(hits).toEqual([]);
    expect(ranges.every((range) => range.productCount === 0)).toBe(true);
  });
});
