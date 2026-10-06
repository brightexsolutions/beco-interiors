import type { CatalogueProduct, CategoryGroup } from './products';

/**
 * The shop browses by range first, D119. `/shop` is an index of the ranges,
 * `/shop/<range>` is where the grid and its controls live, and `/shop/all`
 * is the one flat list for someone who wants everything. The pieces below are
 * the pure parts of that: what a filter does to a list, what the chips are,
 * and where an old `/shop?range=` address goes now.
 */

export type ShopSort = 'name' | 'price-asc' | 'price-desc';

export const SHOP_SORTS: readonly { value: ShopSort; label: string }[] = [
  { value: 'name', label: 'Sort: name' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
];

export const isShopSort = (value: string): value is ShopSort =>
  SHOP_SORTS.some((s) => s.value === value);

/** The finish is a spec, so it is read from there rather than being a column. */
export const finishOf = (p: CatalogueProduct): string | null => p.specs?.['Finish'] ?? null;

export interface CatalogueFilter {
  q?: string | undefined;
  finish?: string | undefined;
  sort?: string | undefined;
}

/** True when any control is set, which is when a view is noindex and canonicalises to its page. D29. */
export const isFilteredView = (f: CatalogueFilter): boolean =>
  Boolean(f.q?.trim() || f.finish || (f.sort && f.sort !== 'name'));

/**
 * Search, finish and sort over a list that is already scoped to a range.
 * Unpriced items sort last either way: a POA product has no place in a
 * cheapest-first list, and putting it at zero would be a lie.
 */
export const applyCatalogueFilters = (
  products: readonly CatalogueProduct[],
  { q, finish, sort }: CatalogueFilter,
): CatalogueProduct[] => {
  const needle = (q ?? '').trim().toLowerCase();
  let out = products.filter((p) => {
    if (needle && !p.name.toLowerCase().includes(needle)) return false;
    if (finish && finishOf(p) !== finish) return false;
    return true;
  });
  if (sort === 'price-asc' || sort === 'price-desc') {
    out = [...out].sort((a, b) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
    });
  }
  return out;
};

export interface Facet {
  value: string;
  label: string;
  count: number;
}

/** Finishes present in a list, most common first. Counted on the whole range, never the filtered view. */
export const finishFacetsOf = (products: readonly CatalogueProduct[]): Facet[] => {
  const counts = new Map<string, number>();
  for (const p of products) {
    const f = finishOf(p);
    if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
};

export interface RangeChip {
  href: string;
  label: string;
  count: number;
  active: boolean;
}

/**
 * The chips above a grid: "All" for the level being browsed, then each range
 * at the level below it, every one a link to a real page rather than a query
 * parameter, which is what lets those pages rank. `activeSlug` null means the
 * "All" level itself is open.
 */
export const rangeChips = ({
  allHref,
  allCount,
  items,
  activeSlug,
}: {
  allHref: string;
  allCount: number;
  items: readonly Pick<CategoryGroup, 'slug' | 'name' | 'total_count'>[];
  activeSlug: string | null;
}): RangeChip[] => [
  { href: allHref, label: 'All', count: allCount, active: activeSlug === null },
  ...items.map((item) => ({
    href: `/shop/${item.slug}`,
    label: item.name,
    count: item.total_count,
    active: item.slug === activeSlug,
  })),
];

/** Products and stocked top level ranges, for the line under the tiles. */
export const rangeSummary = (groups: readonly CategoryGroup[]): { products: number; ranges: number } => ({
  products: groups.reduce((n, g) => n + g.total_count, 0),
  ranges: groups.filter((g) => g.total_count > 0).length,
});

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Where an old filtered `/shop` address goes. `?range=` and `?category=` were
 * never pages of their own (D29 canonicalised them to `/shop`), so the range
 * page is the honest successor. Search, finish and sort carry over to the
 * flat list. Nothing set means nothing to redirect.
 */
export const legacyShopRedirect = (params: Search): string | null => {
  const range = one(params.range).trim();
  const category = one(params.category).trim();
  const slug = category || range;
  if (slug && /^[a-z0-9-]+$/.test(slug)) return `/shop/${slug}`;
  const next = new URLSearchParams();
  const q = one(params.q).trim();
  const finish = one(params.finish).trim();
  const sort = one(params.sort).trim();
  if (q) next.set('q', q.slice(0, 80));
  if (finish) next.set('finish', finish.slice(0, 40));
  if (sort && isShopSort(sort) && sort !== 'name') next.set('sort', sort);
  const query = next.toString();
  return query ? `/shop/all?${query}` : null;
};
