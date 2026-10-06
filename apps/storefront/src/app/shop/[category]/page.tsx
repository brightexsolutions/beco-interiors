import { Fragment } from 'react';
import type { Metadata } from 'next';
import { catalogueOgImage, pageMetadata, rangeDescription, rangeTitle } from '@/lib/seo';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, CutoutReveal, buttonClasses } from '@beco/ui';
import { ProductGridPaginated } from '@/components/product-grid-paginated';
import { RangeToolbar } from '@/components/range-toolbar';
import {
  getCategoryWithTree, getCategorySlugs, getCategoryTree, getProductsByCategory, getProductsInCategories,
  categoryIsIndexable, primaryImage, blurProps, flattenTree,
} from '@/lib/products';
import { applyCatalogueFilters, finishFacetsOf, isFilteredView, rangeChips } from '@/lib/shop';
import { SITE } from '@/lib/site';
import { isStoneRange, stockCount } from '@/lib/material';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((category) => ({ category }));
}

type Search = Record<string, string | string[] | undefined>;
type Params = { params: Promise<{ category: string }>; searchParams: Promise<Search> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const readFilter = (params: Search) => ({
  q: one(params.q).trim().slice(0, 80),
  finish: one(params.finish).trim().slice(0, 40),
  sort: one(params.sort).trim(),
});

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { category: slug } = await params;
  const tree = await getCategoryWithTree(slug);
  if (!tree) return {};
  const { category } = tree;
  const filtered = isFilteredView(readFilter(await searchParams));

  // Asked of the SUBTREE, so a group counts what is beneath it. The same
  // helper backs the sitemap, so the robots tag and the sitemap cannot
  // disagree about whether this page exists for search.
  const indexable = await categoryIsIndexable(slug);

  return pageMetadata({
    title: rangeTitle(category.name),
    description: rangeDescription(category.name, category.description),
    path: `/shop/${category.slug}`,
    // Drawn from a photograph of something in the range; the route falls
    // back to the shop photograph, still named for this range, when the
    // range has none yet.
    image: catalogueOgImage('range', category.slug, `${category.name} from Beco Interiors, Nairobi`),
    // D27: a category with nothing in it is thin content, so it stays out of
    // the index until the import gives it something to say. The flip is
    // automatic on published product count, because Drive folders are still
    // being filled and nobody should have to remember to come back. D29: a
    // searched, finish filtered or sorted view is noindex too, canonical to
    // the bare range page above.
    ...(indexable && !filtered ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function CategoryPage({ params, searchParams }: Params) {
  const { category: slug } = await params;
  const [tree, filter, fullTree] = await Promise.all([
    getCategoryWithTree(slug),
    searchParams.then(readFilter),
    getCategoryTree(),
  ]);
  if (!tree) notFound();
  const { category, parent, ancestors, children } = tree;

  // One route, one job at every level. A category with ranges beneath it
  // shows those ranges and everything in them, its own products included
  // (12mm Sintered Stones holds stones of its own beside the Heixin sub
  // range); a leaf shows its own products. Branching here rather than in
  // several routes keeps /shop/<anything> a single URL shape, which is what
  // the breadcrumbs, the sitemap and every existing link already assume.
  const isGroup = children.length > 0;
  const inRange = isGroup
    ? await getProductsInCategories(flattenTree([category]).map((c) => c.id))
    : await getProductsByCategory(slug);
  // The grid shows the filtered view; counts, facets, the cover and the
  // structured data describe the whole range, which is what the page is.
  const products = applyCatalogueFilters(inRange, filter);
  const finishes = finishFacetsOf(inRange);

  // The chips, D119: on a range with ranges beneath it, "All" is this page
  // and each child is a link. On a child, the chips are its siblings under
  // the parent, "All" is the parent, and this page is the one marked current.
  const chips = isGroup
    ? rangeChips({ allHref: `/shop/${category.slug}`, allCount: category.total_count, items: children, activeSlug: null })
    : parent
      ? (() => {
          const parentNode = flattenTree(fullTree).find((c) => c.slug === parent.slug);
          return parentNode
            ? rangeChips({ allHref: `/shop/${parent.slug}`, allCount: parentNode.total_count, items: parentNode.children, activeSlug: category.slug })
            : [];
        })()
      : [];

  // The right-hand column leads with a bookmatched pair where the range has
  // one: mirror-matched veining is the most striking single image a stone
  // can give, and it sits naturally in the portrait frame. Falls back to a
  // slab, then to whatever the first product has.
  const cover =
    inRange.flatMap((p) => p.images ?? []).find((i) => i.role === 'bookmatch') ??
    inRange.map(primaryImage).find((img) => img !== undefined);

  return (
    <main>
      {/* Split into two padded halves rather than one wrapper, so the cutout
          section below, which is full bleed with its own background, can sit
          BETWEEN them as a true edge to edge break instead of nesting inside
          a container that already caps the width and pads the sides, which
          would apply both twice. When nothing sits between them the two
          halves are plain stacked siblings and the page reads exactly as it
          did as one wrapper, per normal margin collapse. */}
      <div className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 pt-16 sm:pt-20 lg:pt-24">
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex flex-wrap items-center gap-2 font-ui text-sm text-neutral-500">
          <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/shop" className="hover:text-charcoal">Shop</Link></li>
          {ancestors.map((ancestor) => (
            <Fragment key={ancestor.id}>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/shop/${ancestor.slug}`} className="hover:text-charcoal">
                  {ancestor.name}
                </Link>
              </li>
            </Fragment>
          ))}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-charcoal">{category.name}</li>
        </ol>
      </nav>

      {/* --- The opening ran down the left at a capped measure with nothing
              opposite it, so a long description left half the screen blank.
              The photograph and the facts now hold the right hand column, and
              on a range with no photography the facts hold it alone. --- */}
      <header className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {parent ? parent.name : 'The range'}
            </p>
          </div>

          <h1 className="mt-5 max-w-[15ch] font-display text-5xl leading-[1.04] tracking-[-0.015em] text-charcoal sm:text-6xl">
            {category.name}
          </h1>

          {category.description ? (
            <div className="mt-6 max-w-[62ch] space-y-4 text-base leading-[1.65] text-neutral-700 lg:text-lg">
              {category.description.split('\n\n').map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link href="/contact" className={buttonClasses({ variant: 'outline' })}>
              Visit the showroom
            </Link>
          </div>
        </div>

        {/* The description runs long for SEO. The right column STRETCHES to the
            full height of that copy (grid items align stretch), and the
            photograph grows to fill whatever is left above the facts list, so
            there is no dead space beside the lower paragraphs. On mobile it is
            a normal 4:5 frame stacked under the copy. */}
        <aside className="lg:col-span-5 lg:flex lg:flex-col">
          {cover ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card bg-neutral-100 lg:aspect-auto lg:min-h-[28rem] lg:flex-1">
              <Image
                src={cover.path}
                alt={cover.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                {...blurProps(cover)}
                className="object-cover"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-inset ring-charcoal/15"
              />
            </div>
          ) : null}

          <dl className="mt-6 flex flex-col gap-1 rounded-card bg-neutral-50 px-5 py-1">
            <Fact
              term={isGroup ? 'Ranges' : 'In stock'}
              value={
                isGroup
                  ? `${children.length}`
                  : inRange.length > 0
                    ? stockCount(inRange.length, isStoneRange([category, ...ancestors]))
                    : 'Being photographed'
              }
            />
            <Fact term="Collection" value="Urban Square, Industrial Area" />
            <Fact term="Advice" value={SITE.phone} href={SITE.phoneHref} />
          </dl>
        </aside>
      </header>

      </div>

      {/* The same cutout treatment as the home page's teaser for this range,
          added 4 September, but its own copy and no repeated stat: the fact
          block above already states the finish count, and stacking the same
          number under it a few hundred pixels later would read as filler
          rather than as new information. See D73. Gated on the slug, not on
          being a leaf: this is the one range with a cutout photograph today,
          not a treatment every range gets by default. Full bleed, a sibling
          of the two padded halves rather than nested in either. */}
      {category.slug === 'handles' ? (
        <CutoutReveal
          eyebrow="On the floor"
          title="Match it to the room."
          body="Bring a cabinet door or a paint chip and hold it against the finish in person. Matte black reads differently under a kitchen's own light than it does on a screen."
          images={[
            <Image
              key="black-handle"
              src="/cutouts/black-handle.webp"
              alt="A matte black cabinet handle"
              fill
              priority
              sizes="(max-width: 1024px) 70vw, 22rem"
              className="object-contain"
            />,
          ]}
          stats={[]}
          cta={{ label: 'Visit the showroom', href: '/contact' }}
          reverse
        />
      ) : null}

      {/* --- Same neutral-50 surface as /shop's own catalogue grid, per the
              site-wide note that every surface reading flat white left the
              product cards nothing to sit on. --- */}
      <section className="bg-neutral-50">
      <div className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
      <div>
        {inRange.length === 0 ? (
          <EmptyState
            title="This range is coming soon"
            description="We are photographing it now. In the meantime our team can advise on
                         specification and pricing directly."
            action={
              <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
                Request a quote
              </Link>
            }
          />
        ) : (
          <>
            <h2 className="mb-6 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {isGroup ? `Everything in ${category.name.toLowerCase()}` : category.name}
            </h2>
            {/* The strip, D119: chips to the ranges beneath or beside this
                one, finish, search and sort for this range alone. */}
            <div className="mb-10">
              <RangeToolbar chips={chips} finishes={finishes} total={inRange.length} showing={products.length} />
            </div>
            {products.length === 0 ? (
              <EmptyState
                title="Nothing matches that here"
                description="Try a shorter search, clear the finish, or open the whole range."
                action={
                  <Link href={`/shop/${category.slug}`} className={buttonClasses({ variant: 'primary' })}>
                    Show the whole range
                  </Link>
                }
              />
            ) : (
              <ProductGridPaginated products={products} />
            )}
          </>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.beco.co.ke/' },
              { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://www.beco.co.ke/shop' },
              // The group is a real level in the tree, so it is a real step in
              // the trail. Skipping it told search engines the taxonomy was
              // flatter than the navigation actually is.
              ...(parent
                ? [{
                    '@type': 'ListItem', position: 3, name: parent.name,
                    item: `https://www.beco.co.ke/shop/${parent.slug}`,
                  }]
                : []),
              {
                '@type': 'ListItem', position: parent ? 4 : 3, name: category.name,
                item: `https://www.beco.co.ke/shop/${category.slug}`,
              },
            ],
          }),
        }}
      />

      {/* ItemList over the grid, so the products on this page are stated as an
          ordered set rather than left to be inferred from the markup. */}
      {inRange.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: category.name,
              numberOfItems: inRange.length,
              itemListElement: inRange.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: p.name,
                url: `https://www.beco.co.ke/product/${p.slug}`,
              })),
            }),
          }}
        />
      ) : null}
      </div>
      </section>
    </main>
  );
}

function Fact({ term, value, href }: { term: string; value: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {term}
      </dt>
      <dd className="text-right font-ui text-sm font-semibold text-charcoal">
        {href ? (
          <a href={href} className="underline-offset-4 hover:underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
