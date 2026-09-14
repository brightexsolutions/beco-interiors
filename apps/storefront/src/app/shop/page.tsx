import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
import { ProductGridPaginated } from '@/components/product-grid-paginated';
import { SlabRail } from '@/components/slab-rail';
import { CinematicBackground } from '@/components/cinematic-background';
import { ShopControls, type Facet, type FacetGroup } from '@/components/shop-controls';
import {
  getPublishedProducts, getCategoryTree,
  type CatalogueProduct, type CategoryGroup,
} from '@/lib/products';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<Search> },
): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Boolean(
    one(params.q) || one(params.range) || one(params.category) ||
    one(params.finish) || one(params.sort),
  );

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

/** Every category slug in a range, so a group filters to its whole subtree. */
const subtreeSlugs = (group: CategoryGroup) =>
  new Set([group.slug, ...group.children.map((c) => c.slug)]);

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q).trim().toLowerCase();
  const range = one(params.range);
  const category = one(params.category);
  const finish = one(params.finish);
  const sort = one(params.sort) || 'name';

  const [all, groups] = await Promise.all([getPublishedProducts(), getCategoryTree()]);

  // Facet counts come from the WHOLE range, not the filtered view, so a count
  // never drops to zero under your own filter and leaves you unable to widen
  // the search again.
  const countIn = (slugs: Set<string>) =>
    all.filter((p) => (p.category ? slugs.has(p.category.slug) : false)).length;

  const facetGroups: FacetGroup[] = groups.map((group) => ({
    value: group.slug,
    label: group.name,
    count: countIn(subtreeSlugs(group)),
    children: group.children.map((child) => ({
      value: child.slug,
      label: child.name,
      count: child.product_count,
    })),
  }));

  const finishCounts = new Map<string, number>();
  for (const p of all) {
    const f = finishOf(p);
    if (f) finishCounts.set(f, (finishCounts.get(f) ?? 0) + 1);
  }
  const finishFacets: Facet[] = [...finishCounts]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));

  const activeGroup = groups.find((g) => g.slug === range);
  const rangeSlugs = activeGroup ? subtreeSlugs(activeGroup) : null;

  let products = all.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (rangeSlugs && !(p.category ? rangeSlugs.has(p.category.slug) : false)) return false;
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

  const filtered = Boolean(q || range || category || finish);
  // Several real rooms crossfading rather than one static photograph,
  // reported directly as wanting the same cinematic feel as the home hero.
  // One per product so the same room never repeats, and held to `application`
  // shots specifically, wide interior context, per the guideline's own
  // photography direction, rather than a slab close up standing in as a hero.
  const heroImages = all
    .map((p) => p.images?.find((i) => i.role === 'application'))
    .filter((img): img is NonNullable<typeof img> => img !== undefined)
    .slice(0, 5);

  // One rail, standing for the whole business rather than the range with the
  // most photography: up to three products per top level group, badged
  // stock preferred within each, so sintered stone cannot fill the row on
  // its own and lighting, panels and accessories actually appear in it. A
  // second rail per range was tried and reported back as repetitive right
  // after this one, so this is the only curated row before the general grid.
  const featured = groups
    .flatMap((group) => {
      const inGroup = all.filter((p) => p.category && subtreeSlugs(group).has(p.category.slug));
      const badged = inGroup.filter((p) => p.badge === 'hot' || p.badge === 'new');
      return (badged.length > 0 ? badged : inGroup).slice(0, 3);
    })
    .slice(0, 12);

  return (
    <main>
      {/* --- A real photograph, not the slim identity bar this used to be:
              reported directly as wanting the shop to open with the same
              presence the rest of the site has, per the reference shared.
              Shorter than the home hero, which earns full viewport height by
              being the first thing anyone sees, but tall enough to give the
              docked search card below something to sit on. --- */}
      <section className="relative flex min-h-[24rem] items-end overflow-hidden border-b border-neutral-200 bg-charcoal sm:min-h-[28rem] lg:min-h-[32rem]">
        <div className="absolute inset-0 opacity-45">
          <CinematicBackground images={heroImages} />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent"
        />

        <div className="relative mx-auto w-full max-w-[1380px] px-6 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-px w-8 bg-warm-red" />
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
              Everything in stock
            </p>
          </div>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl leading-[1.08] tracking-[-0.015em] text-high-vis-white sm:text-5xl">
            Interior finishing materials.
          </h1>
          <p className="mt-4 max-w-[46ch] text-base leading-[1.6] text-neutral-300">
            Sintered stone, lighting, panels and accessories, stocked in Nairobi and priced the
            day you ask.
          </p>
        </div>
      </section>

      {/* Docked over the hero's own bottom edge, see the component's own
          note: the search, the filters and the live count are the one
          thing every visitor here wants first, so they sit on the hero
          rather than waiting below it. */}
      <ShopControls
        groups={facetGroups}
        finishes={finishFacets}
        total={all.length}
        showing={products.length}
      />

      {/* --- One curated row, only while browsing rather than filtering: a
              featured rail under a search or a facet is noise about things
              nobody asked for, the same reasoning ComingSoon below already
              uses. --- */}
      {!filtered ? (
        <SlabRail
          products={featured}
          eyebrow="Featured"
          heading="On the floor right now."
          viewAllHref="/shop"
          viewAllLabel="View all"
        />
      ) : null}

      <div className="mx-auto max-w-[1380px] px-6 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-warm-red" />
          <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {filtered ? 'Matching the filter' : 'The whole catalogue'}
          </h2>
        </div>

        <div className="mt-8">
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
            <ProductGridPaginated products={products} />
          )}
        </div>

        {/* --- Ranges still being photographed. Shown so the site does not
                present Beco as a stone supplier with a sideline in handles, and
                said plainly so nobody thinks they are on the floor today. Only
                when the reader is looking at everything: under a filter it is
                noise about things they did not ask for. --- */}
        {!filtered ? <ComingSoon groups={groups} /> : null}
      </div>
    </main>
  );
}


function ComingSoon({ groups }: { groups: CategoryGroup[] }) {
  const empty = groups
    .flatMap((g) => (g.children.length > 0 ? g.children : [g]))
    .filter((c) => c.product_count === 0);
  if (empty.length === 0) return null;

  return (
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
  );
}
