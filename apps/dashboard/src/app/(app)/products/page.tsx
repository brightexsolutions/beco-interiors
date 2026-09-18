import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { NewProductFab } from '@/components/new-product';
import { ProductFilters } from '@/components/product-filters';
import { ProductResults } from '@/components/product-results';
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

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requirePath('/products');
  const params = await searchParams;
  const filters: ProductListFilters = {
    search: one(params.search) || undefined,
    availability: (one(params.availability) || undefined) as Availability | 'out' | undefined,
    published: (one(params.published) || undefined) as ProductListFilters['published'],
    stock: (one(params.stock) || undefined) as ProductListFilters['stock'],
  };

  const supabase = await getSupabase();
  const [products, categories] = await Promise.all([
    fetchProducts(supabase, filters),
    fetchProductCategories(supabase),
  ]);
  const editSlug = one(params.edit);
  const creating = one(params.new) === '1' && !editSlug;
  const editing = editSlug
    ? (products.find((product) => product.slug === editSlug) ?? (await fetchProductBySlug(supabase, editSlug)))
    : null;

  return (
    <>
      <PageHeading eyebrow="Catalogue" title="Products" />
      <div className="mb-4">
        <ProductFilters />
      </div>
      <div className="pb-24">
        <ProductResults products={products} editing={editing} creating={creating} categories={categories} />
      </div>
      <NewProductFab />
    </>
  );
}
