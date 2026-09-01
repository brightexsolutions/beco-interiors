import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
import { PageHeader } from '@/components/page-header';
import { ProductGrid } from '@/components/product-grid';
import { ShopControls, type Facet } from '@/components/shop-controls';
import { getPublishedProducts, getAllCategories, type CatalogueProduct } from '@/lib/products';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Search> },
): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Boolean(one(params.q) || one(params.category) || one(params.finish) || one(params.sort));

  return {
    title: 'Shop interior finishing materials',
    description:
      'Sintered stone slabs, panels, lighting and accessories, stocked in Nairobi. Search the range, filter by finish, and request a quote.',
    // D29: every filtered view canonicalises to the base and carries noindex,
    // so a multi facet grid cannot generate hundreds of thin duplicate URLs.
    alternates: { canonical: '/shop' },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

/** The finish is a spec, so it is read from there rather than being a column. */
const finishOf = (p: CatalogueProduct) => p.specs?.['Finish'] ?? null;

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q).trim().toLowerCase();
  const category = one(params.category);
  const finish = one(params.finish);
  const sort = one(params.sort) || 'name';

  const [all, categories] = await Promise.all([getPublishedProducts(), getAllCategories()]);

  // Facet counts come from the WHOLE range, not the filtered view, so a count
  // never drops to zero under your own filter and leaves you unable to widen
  // the search again.
  const categoryFacets: Facet[] = categories
    .filter((c) => c.product_count > 0)
    .map((c) => ({ value: c.slug, label: c.name, count: c.product_count }));

  const finishCounts = new Map<string, number>();
  for (const p of all) {
    const f = finishOf(p);
    if (f) finishCounts.set(f, (finishCounts.get(f) ?? 0) + 1);
  }
  const finishFacets: Facet[] = [...finishCounts]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));

  let products = all.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (category && p.category?.slug !== category) return false;
    if (finish && finishOf(p) !== finish) return false;
    return true;
  });

  if (sort === 'price-asc' || sort === 'price-desc') {
    // Unpriced items sort last either way: a POA product has no place in a
    // cheapest-first list, and putting it at zero would be a lie.
    products = [...products].sort((a, b) => {
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
    });
  }

  const empty = categories.filter((c) => c.product_count === 0);

  return (
    <main className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20 lg:py-24">
      <PageHeader
        className="mb-10"
        eyebrow="Everything in stock"
        title="Interior finishing materials."
        lede={`${all.length} products, held in Nairobi. Add what the project needs to a list and we will price the whole thing at once.`}
      />

      <ShopControls
        categories={categoryFacets}
        finishes={finishFacets}
        total={all.length}
        showing={products.length}
      />

      <div className="mt-12">
        {products.length === 0 ? (
          <EmptyState
            title="Nothing matches that"
            description="Try a shorter search, or clear the filters to see the whole range."
            action={
              <Link href="/shop" className={buttonClasses({ variant: 'primary' })}>
                Show everything
              </Link>
            }
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </div>

      {/* --- Ranges still being photographed. Shown so the site does not
              present Beco as a stone supplier with a sideline in handles, and
              said plainly so nobody thinks they are on the floor today. --- */}
      {empty.length > 0 ? (
        <section className="mt-24 border-t border-neutral-200 pt-12">
          <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Also stocked, being photographed
          </h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            {empty.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/shop/${c.slug}`}
                  className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500 transition-colors hover:text-charcoal"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-[56ch] font-ui text-sm text-neutral-500">
            These are in the showroom now. Photography is on its way, and our team can price
            anything on this list today.
          </p>
        </section>
      ) : null}
    </main>
  );
}
