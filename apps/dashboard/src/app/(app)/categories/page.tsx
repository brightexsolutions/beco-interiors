import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { NewCategoryFab } from '@/components/new-category';
import { CategoryTree } from '@/components/category-tree';
import { fetchCategoryGroupOptions, fetchCategoryTree } from '@/lib/categories';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Ranges',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/categories');
  const params = await searchParams;

  const supabase = await getSupabase();
  const [tree, groupOptions] = await Promise.all([
    fetchCategoryTree(supabase),
    fetchCategoryGroupOptions(supabase),
  ]);

  const editId = one(params.edit);
  const creating = one(params.new) === '1' && !editId;
  const flat = tree.flatMap((group) => [group, ...group.children]);
  const editing = editId ? (flat.find((row) => row.id === editId) ?? null) : null;

  return (
    <>
      <PageHeading
        eyebrow="Catalogue"
        title="Ranges"
        lede="Sintered Stone, Lighting, the rest of what Beco sells, and the varieties filed under each. Rename, reorganise or publish a range here. Product prices and photographs stay on Catalogue."
      />
      <div className="pb-24">
        <CategoryTree tree={tree} editing={editing} creating={creating} groupOptions={groupOptions} />
      </div>
      <NewCategoryFab />
    </>
  );
}
