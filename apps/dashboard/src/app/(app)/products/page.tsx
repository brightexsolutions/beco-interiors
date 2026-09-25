import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { NewProductFab } from '@/components/new-product';
import { CatalogueRanges } from '@/components/catalogue-ranges';
import { ProductFilters } from '@/components/product-filters';
import { ProductResults } from '@/components/product-results';
import { categoryIdsInSelection, fetchCategoryGroupOptions, fetchCategoryTree } from '@/lib/categories';
import { fetchProductBySlug, fetchProductCategories, fetchProducts, type ProductListFilters } from '@/lib/products';
import { requirePath } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import type { Availability } from '@beco/types';

export const metadata: Metadata = {
  title: 'Catalogue',
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * The catalogue: ranges and the products filed under them, one screen.
 *
 * Previously two: `/products` and `/categories`, reported directly as
 * confusing to hold in your head as the same job, since a range is not a
 * separate concern from what is filed under it, it is the organising
 * principle of the whole list below. D91's own call to keep them apart is
 * reversed here on Brown's fresh, direct instruction; see docs/DECISIONS.md.
 *
 * `/categories` still exists as a redirect so an old link does not 404.
 */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/products');
  const params = await searchParams;

  const supabase = await getSupabase();
  const [tree, groupOptions, productCategories] = await Promise.all([
    fetchCategoryTree(supabase),
    fetchCategoryGroupOptions(supabase),
    fetchProductCategories(supabase),
  ]);

  const selectedCategoryId = one(params.category) || null;
  const filters: ProductListFilters = {
    search: one(params.search) || undefined,
    availability: (one(params.availability) || undefined) as Availability | 'out' | undefined,
    published: (one(params.published) || undefined) as ProductListFilters['published'],
    stock: (one(params.stock) || undefined) as ProductListFilters['stock'],
    categoryIds: categoryIdsInSelection(tree, selectedCategoryId) ?? undefined,
  };
  const products = await fetchProducts(supabase, filters);

  const editSlug = one(params.edit);
  const creating = one(params.new) === '1' && !editSlug;
  const editing = editSlug
    ? (products.find((product) => product.slug === editSlug) ?? (await fetchProductBySlug(supabase, editSlug)))
    : null;

  const editRangeId = one(params.range);
  const creatingRange = one(params.newRange) === '1' && !editRangeId;
  const flatRanges = tree.flatMap((group) => [group, ...group.children]);
  const editingRange = editRangeId ? (flatRanges.find((row) => row.id === editRangeId) ?? null) : null;

  return (
    <>
      <PageHeading
        eyebrow="Catalogue"
        title="Catalogue"
        lede="Sintered Stone, Lighting, the rest of what Beco sells, the varieties filed under each, and every product in them. One screen for all of it."
      />
      <CatalogueRanges
        tree={tree}
        groupOptions={groupOptions}
        editing={editingRange}
        creating={creatingRange}
        selectedId={selectedCategoryId}
      />
      <div className="mb-4">
        <ProductFilters />
      </div>
      <div className="pb-24">
        <ProductResults products={products} editing={editing} creating={creating} categories={productCategories} />
      </div>
      <NewProductFab />
    </>
  );
}
