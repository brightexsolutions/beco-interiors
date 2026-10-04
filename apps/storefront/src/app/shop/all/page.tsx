import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
import { ProductGridPaginated } from '@/components/product-grid-paginated';
import { RangeToolbar } from '@/components/range-toolbar';
import { getPublishedProducts, getCategoryTree } from '@/lib/products';
import { applyCatalogueFilters, isFilteredView, rangeChips } from '@/lib/shop';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const read = (params: Search) => ({
  q: one(params.q).trim().slice(0, 80),
  finish: one(params.finish).trim().slice(0, 40),
  sort: one(params.sort).trim(),
});

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const filter = read(await searchParams);
  return {
    title: 'Everything we stock',
    description:
      'Every stone, panel, handle and fitting Beco Interiors stocks in Nairobi, on one page. Search by name or sort by price, then request a quote.',
    // D29: a searched or sorted view canonicalises to the bare list and
    // carries noindex, so this one page cannot become hundreds.
    alternates: { canonical: '/shop/all' },
    ...(isFilteredView(filter) ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * The one flat list, D119: for the reader who wants to scroll everything, or
 * who searched from /shop. The chips here are the top level ranges, each a
 * link to its own page, so this list is also the way back into the tree.
 */
export default async function AllProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filter = read(await searchParams);
  const [all, groups] = await Promise.all([getPublishedProducts(), getCategoryTree()]);
  const products = applyCatalogueFilters(all, filter);
  const chips = rangeChips({
    allHref: '/shop/all',
    allCount: all.length,
    items: groups.filter((g) => g.total_count > 0),
    activeSlug: null,
  });

  return (
    <main>
      <div className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 pt-16 sm:pt-20 lg:pt-24">
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
            <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/shop" className="hover:text-charcoal">Shop</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-charcoal">Everything</li>
          </ol>
        </nav>

        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">The whole catalogue</p>
        </div>
        <h1 className="mt-5 max-w-[15ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
          Everything we stock.
        </h1>
        <p className="mt-6 max-w-[56ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
          Every stone, panel, handle and fitting on the floor at Urban Square, on one page. Pick a
          range to narrow it, or search by name.
        </p>

        <div className="mt-10">
          <RangeToolbar chips={chips} finishes={[]} total={all.length} showing={products.length} searchPlaceholder="Search the catalogue" />
        </div>
      </div>

      <section className="mt-12 bg-neutral-50">
        <div className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-16 sm:py-20">
          {products.length === 0 ? (
            <EmptyState
              title="Nothing matches that"
              description="Try a shorter search, or clear it to see the whole range."
              action={
                <Link href="/shop/all" className={buttonClasses({ variant: 'primary' })}>
                  Show everything
                </Link>
              }
            />
          ) : (
            <ProductGridPaginated products={products} />
          )}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.beco.co.ke/shop' },
              { '@type': 'ListItem', position: 3, name: 'Everything', item: 'https://www.beco.co.ke/shop/all' },
            ],
          }),
        }}
      />
      {all.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Everything we stock',
              numberOfItems: all.length,
              itemListElement: all.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: p.name,
                url: `https://www.beco.co.ke/product/${p.slug}`,
              })),
            }),
          }}
        />
      ) : null}
    </main>
  );
}
