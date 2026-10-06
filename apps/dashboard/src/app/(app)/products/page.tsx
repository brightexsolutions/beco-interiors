import type { Metadata } from 'next';
import Link from 'next/link';
import { Panel, TableToolbar, buttonClasses } from '@beco/ui';
import { PageHeading } from '@/components/page-heading';
import { NewProductFab } from '@/components/new-product';
import { CatalogueRanges } from '@/components/catalogue-ranges';
import { ProductFilters } from '@/components/product-filters';
import { ProductResults } from '@/components/product-results';
import { categoryIdsInSelection, categoryParentOptions, fetchCategoryTree, flattenCategoryTree } from '@/lib/categories';
import { fetchProductBySlug, fetchProductCategories, fetchProducts, type ProductListFilters } from '@/lib/products';
import { canAccess } from '@/lib/access';
import { QueryNavigationProvider } from '@/lib/use-query-navigation';
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
  const user = await requirePath('/products');
  const canImport = canAccess(user.role, '/products/import');
  const params = await searchParams;

  const supabase = await getSupabase();
  const [tree, productCategories] = await Promise.all([
    fetchCategoryTree(supabase),
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
  const editingRange = editRangeId ? (flattenCategoryTree(tree).find((row) => row.id === editRangeId) ?? null) : null;
  // Where this range may be filed: computed against the range being edited,
  // so it is never offered its own sub ranges or a home too deep for the
  // levels it already carries.
  const groupOptions = categoryParentOptions(tree, editingRange?.id);

  return (
    <>
      <PageHeading
        eyebrow="Catalogue"
        title="Catalogue"
        lede="Every range and product Beco sells."
        actions={
          <>
            {canImport ? (
              <Link href="/products/import" className={buttonClasses({ variant: 'outline' })}>
                Drive import
              </Link>
            ) : null}
            <NewProductFab />
          </>
        }
      />
      {/* One transition for the pills, the filters and the list, so a tap on
          any of them dims the list and shows Busy. D117. */}
      <QueryNavigationProvider>
        <CatalogueRanges
          tree={tree}
          groupOptions={groupOptions}
          editing={editingRange}
          creating={creatingRange}
          selectedId={selectedCategoryId}
          createParentId={one(params.parent) || null}
        />
        <Panel>
          <TableToolbar
            filters={<ProductFilters />}
            count={`${products.length} ${products.length === 1 ? 'product' : 'products'}`}
          />
          <div className="px-4 pb-4 sm:px-5 xl:px-0 xl:pb-0">
            <ProductResults products={products} editing={editing} creating={creating} categories={productCategories} />
          </div>
        </Panel>
      </QueryNavigationProvider>
    </>
  );
}
