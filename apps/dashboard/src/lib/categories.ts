import { createServerClient } from '@beco/supabase-client';

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Every category, published or not: an admin has to see a draft range to
 * publish it. `product_count` and `child_count` decide whether Delete is
 * offered, since neither a range with stock in it nor a group with children
 * under it can be removed without orphaning something.
 */
export interface CategoryRow {
  id: string;
  /** 1 for a major category, 2 for a range under it, 3 for a sub range. */
  depth: number;
  name: string;
  slug: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isPublished: boolean;
  productCount: number;
  childCount: number;
  updatedAt: string;
}

/** A category with whatever is filed under it, to three levels (D104). */
export interface CategoryGroupRow extends CategoryRow {
  children: CategoryGroupRow[];
}

/** Every row in a tree, parents before their children. */
export const flattenCategoryTree = (tree: readonly CategoryGroupRow[]): CategoryGroupRow[] =>
  tree.flatMap((node) => [node, ...flattenCategoryTree(node.children)]);

/** Products across a node and everything under it. */
export const subtreeProductCount = (node: CategoryGroupRow): number =>
  node.productCount + node.children.reduce((sum, child) => sum + subtreeProductCount(child), 0);

// PostgREST cannot be given a hint to pick a direction on a self join: both
// the constraint name and the column name resolve to the CHILD rows, never
// the one row parent_id itself points at. Confirmed directly against the
// REST API, not assumed. The storefront's own getCategoryWithTree already
// works around this the same way, a separate lookup rather than an embed.
const ROW_COLUMNS =
  'id,name,slug,description,meta_title,meta_description,parent_id,sort_order,is_published,updated_at,' +
  'products(count)';

interface RawRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
  products: { count: number }[] | null;
}

const toRow = (raw: RawRow, parentName: string | null, childCount: number, depth: number): CategoryRow => ({
  id: raw.id,
  depth,
  name: raw.name,
  slug: raw.slug,
  description: raw.description,
  metaTitle: raw.meta_title,
  metaDescription: raw.meta_description,
  parentId: raw.parent_id,
  parentName,
  sortOrder: raw.sort_order,
  isPublished: raw.is_published,
  productCount: raw.products?.[0]?.count ?? 0,
  childCount,
  updatedAt: raw.updated_at,
});

const depthOf = (id: string, parentOf: Map<string, string | null>): number => {
  let depth = 1;
  let current = parentOf.get(id) ?? null;
  while (current && depth < 10) {
    depth += 1;
    current = parentOf.get(current) ?? null;
  }
  return depth;
};

/** The whole taxonomy as a tree: every major category, its ranges, their
 *  sub ranges. Three levels at most, held up by the same trigger the
 *  storefront relies on, migration 58. */
export async function fetchCategoryTree(supabase: SupabaseClient): Promise<CategoryGroupRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(ROW_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(`Could not load categories: ${error.message}`);

  const rows = (data ?? []) as unknown as RawRow[];
  const nameById = new Map(rows.map((row) => [row.id, row.name]));
  const parentOf = new Map(rows.map((row) => [row.id, row.parent_id]));
  const childCountOf = new Map<string, number>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    childCountOf.set(row.parent_id, (childCountOf.get(row.parent_id) ?? 0) + 1);
  }

  const flat = rows.map((raw) =>
    toRow(
      raw,
      raw.parent_id ? (nameById.get(raw.parent_id) ?? null) : null,
      childCountOf.get(raw.id) ?? 0,
      depthOf(raw.id, parentOf),
    ),
  );
  const childrenOf = new Map<string, CategoryRow[]>();
  for (const row of flat) {
    if (!row.parentId) continue;
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row]);
  }

  const build = (row: CategoryRow): CategoryGroupRow => ({
    ...row,
    children: row.depth >= 3 ? [] : (childrenOf.get(row.id) ?? []).map(build),
  });

  return flat.filter((row) => !row.parentId).map(build);
}

export async function fetchCategoryBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<CategoryRow | null> {
  const { data, error } = await supabase
    .from('categories')
    .select(ROW_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Could not load that category: ${error.message}`);
  if (!data) return null;
  const raw = data as unknown as RawRow;

  const [{ count }, parent, { data: all }] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', raw.id),
    raw.parent_id
      ? supabase.from('categories').select('name').eq('id', raw.parent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('categories').select('id, parent_id'),
  ]);
  const parentOf = new Map(((all ?? []) as { id: string; parent_id: string | null }[]).map((r) => [r.id, r.parent_id]));
  return toRow(raw, parent.data?.name ?? null, count ?? 0, depthOf(raw.id, parentOf));
}

/** Expands a selected row in the ranges panel to every category id its
 *  products can actually carry: itself, plus its children when it is a
 *  group. A childless group (Lighting) is itself the assignable id, so it
 *  needs no expansion; a group with ranges under it (Sintered Stone) is
 *  never assigned to a product directly, only its children are, per
 *  `groupCategoryOptions`. Null when nothing is selected, so the caller can
 *  tell "show everything" apart from "show a group with nothing filed
 *  under it yet", which would otherwise both look like an empty array. */
export function categoryIdsInSelection(tree: CategoryGroupRow[], selectedId: string | null): string[] | null {
  if (!selectedId) return null;
  const node = flattenCategoryTree(tree).find((row) => row.id === selectedId);
  if (node) return flattenCategoryTree([node]).map((row) => row.id);
  return [selectedId];
}

export interface CategoryParentOption {
  id: string;
  name: string;
}

const heightOf = (node: CategoryGroupRow): number =>
  node.children.length === 0 ? 0 : 1 + Math.max(...node.children.map(heightOf));

/**
 * Where a category can be filed: a major category or a range under one,
 * never a sub range, since three levels is the whole taxonomy. When a
 * category is being edited, itself and everything under it are left out
 * (a category cannot sit under its own sub range), and so is any parent
 * that would push its existing sub ranges past the third level. A range
 * option is named after its major category, "Sintered Stone › 12mm
 * Sintered Stones", so two ranges called Black cannot be confused.
 */
export function categoryParentOptions(tree: CategoryGroupRow[], excludeId?: string): CategoryParentOption[] {
  const flat = flattenCategoryTree(tree);
  const editing = excludeId ? flat.find((row) => row.id === excludeId) : undefined;
  const height = editing ? heightOf(editing) : 0;
  const excluded = new Set(editing ? flattenCategoryTree([editing]).map((row) => row.id) : []);
  return flat
    .filter((row) => row.depth <= 2 && !excluded.has(row.id) && row.depth + 1 + height <= 3)
    .map((row) => ({
      id: row.id,
      name: row.depth === 1 ? row.name : `${row.parentName ?? ''} › ${row.name}`,
    }));
}

export async function fetchCategoryGroupOptions(
  supabase: SupabaseClient,
  excludeId?: string,
): Promise<CategoryParentOption[]> {
  return categoryParentOptions(await fetchCategoryTree(supabase), excludeId);
}
