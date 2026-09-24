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

/** A group with the ranges filed under it, for the tree the admin walks. */
export interface CategoryGroupRow extends CategoryRow {
  children: CategoryRow[];
}

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

const toRow = (raw: RawRow, parentName: string | null, childCount: number): CategoryRow => ({
  id: raw.id,
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

/** The whole taxonomy as a tree: every group, each with its own children.
 *  Two levels only, held up by the same trigger the storefront relies on. */
export async function fetchCategoryTree(supabase: SupabaseClient): Promise<CategoryGroupRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(ROW_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(`Could not load categories: ${error.message}`);

  const rows = (data ?? []) as unknown as RawRow[];
  const nameById = new Map(rows.map((row) => [row.id, row.name]));
  const childCountOf = new Map<string, number>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    childCountOf.set(row.parent_id, (childCountOf.get(row.parent_id) ?? 0) + 1);
  }

  const bySlugRow = rows.map((raw) =>
    toRow(raw, raw.parent_id ? (nameById.get(raw.parent_id) ?? null) : null, childCountOf.get(raw.id) ?? 0),
  );
  const childrenOf = new Map<string, CategoryRow[]>();
  for (const row of bySlugRow) {
    if (!row.parentId) continue;
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row]);
  }

  return bySlugRow
    .filter((row) => !row.parentId)
    .map((group) => ({ ...group, children: childrenOf.get(group.id) ?? [] }));
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

  const [{ count }, parent] = await Promise.all([
    supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', raw.id),
    raw.parent_id
      ? supabase.from('categories').select('name').eq('id', raw.parent_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return toRow(raw, parent.data?.name ?? null, count ?? 0);
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
  const group = tree.find((row) => row.id === selectedId);
  if (group) return group.children.length > 0 ? group.children.map((child) => child.id) : [group.id];
  return [selectedId];
}

export interface CategoryParentOption {
  id: string;
  name: string;
}

/** Groups a new range can be filed under: top level categories with no
 *  parent of their own. A group that already has a parent cannot appear
 *  here, the depth trigger would refuse it anyway. */
export async function fetchCategoryGroupOptions(
  supabase: SupabaseClient,
  excludeId?: string,
): Promise<CategoryParentOption[]> {
  let query = supabase.from('categories').select('id,name').is('parent_id', null).order('name');
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load ranges: ${error.message}`);
  return (data ?? []) as CategoryParentOption[];
}
