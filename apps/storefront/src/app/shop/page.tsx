import type { Metadata } from 'next';
import { pageMetadata, sectionOgImage } from '@/lib/seo';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonClasses } from '@beco/ui';
import { SlabRail } from '@/components/slab-rail';
import { CinematicBackground } from '@/components/cinematic-background';
import { RangeTiles } from '@/components/range-tiles';
import {
  getPublishedProducts, getCategoryTree, subtreeSlugs,
  type CategoryGroup,
} from '@/lib/products';
import { RANGE_GROUPS } from '@/lib/ranges';
import { legacyShopRedirect, rangeSummary } from '@/lib/shop';

export const revalidate = 3600;

type Search = Record<string, string | string[] | undefined>;

export const metadata: Metadata = pageMetadata({
  title: 'Shop Sintered Stone, Panels and Hardware',
  description:
    'Sintered stone slabs, wall panels, cabinet hardware and accessories in stock in Nairobi. Pick a range, compare finishes and request one quote for all of it.',
  path: '/shop',
  image: sectionOgImage('shop'),
});

/** Every category slug in a range, so a group counts its whole subtree. */
const slugSetOf = (group: CategoryGroup) => new Set(subtreeSlugs(group));

/**
 * The shop opens on its ranges, D119. The grid and its controls live on each
 * range's own page, and on /shop/all for everything at once. An old filtered
 * address (`?range=`, `?category=`, `?q=`) is sent where it now belongs.
 */
export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const legacy = legacyShopRedirect(params);
  if (legacy) redirect(legacy);

  const [all, groups] = await Promise.all([getPublishedProducts(), getCategoryTree()]);
  const summary = rangeSummary(groups);

  const heroImages = all
    .map((p) => p.images?.find((i) => i.role === 'application'))
    .filter((img): img is NonNullable<typeof img> => img !== undefined)
    .slice(0, 5);

  // One rail for the whole business: up to three products per RANGE_GROUPS
  // entry, badged stock preferred, so sintered stone cannot fill the row on
  // its own. See the D94 note in docs/DECISIONS.md for why RANGE_GROUPS and
  // not the raw tree.
  const featured = RANGE_GROUPS.flatMap((spec) => {
    const group = groups.find((g) => g.slug === spec.slug);
    if (!group) return [];
    const inGroup = all.filter((p) => p.category && slugSetOf(group).has(p.category.slug));
    const badged = inGroup.filter((p) => p.badge === 'hot' || p.badge === 'new');
    return (badged.length > 0 ? badged : inGroup).slice(0, 3);
  });

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

        <div className="relative mx-auto w-full max-w-[1380px] px-8 pb-16 sm:px-10 sm:pb-20 lg:px-14 lg:pb-24">
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
            Sintered stone, wall panels, hardware and accessories, stocked in Nairobi and priced the
            day you ask.
          </p>
        </div>
      </section>

      {/* --- The ranges, first. A material supplier is shopped by range, not
              by scrolling a flat grid of everything, and each tile is the
              door to a page that can rank on its own. The search beside the
              heading is a plain form: it lands on the flat list with the
              term, no script needed. D119. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 py-16 sm:py-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Browse by range
              </h2>
            </div>
            <p className="mt-4 font-display text-3xl leading-[1.1] text-charcoal sm:text-4xl">
              {summary.products} products across {summary.ranges} {summary.ranges === 1 ? 'range' : 'ranges'}.
            </p>
          </div>
          <form action="/shop/all" method="get" role="search" className="flex w-full gap-2 sm:w-auto">
            <label htmlFor="shop-search" className="sr-only">Search the catalogue</label>
            <input
              id="shop-search"
              name="q"
              type="search"
              enterKeyHint="search"
              placeholder="Search a stone or colour"
              className="h-11 min-w-0 flex-1 rounded-control border border-neutral-300 bg-high-vis-white px-3 font-ui text-base text-charcoal placeholder:text-neutral-500 focus:border-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red sm:w-72"
            />
            <button type="submit" className={buttonClasses({ variant: 'secondary' })}>
              Search
            </button>
          </form>
        </div>

        <div className="mt-10">
          <RangeTiles groups={groups} products={all} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-6">
          <p className="font-ui text-base text-neutral-700">Prefer one list? Everything we stock, on one page.</p>
          <Link
            href="/shop/all"
            className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-warm-red-deep underline-offset-4 hover:underline"
          >
            See everything
          </Link>
        </div>
      </section>

      {/* --- One curated row under the ranges, the same rail the home page
              draws from, linking to the flat list rather than back to this
              page. --- */}
      {featured.length > 0 ? (
        <SlabRail
          products={featured}
          eyebrow="Featured"
          heading="On the floor right now."
          viewAllHref="/shop/all"
          viewAllLabel="See everything"
        />
      ) : null}

      {/* --- Ranges still being photographed, said plainly so nobody thinks
              they are on the floor today, and so the site does not present
              Beco as a stone supplier with a sideline in handles. --- */}
      <section className="mx-auto max-w-[1380px] px-8 sm:px-24 lg:px-40 pb-16 sm:pb-20">
        <ComingSoon groups={groups} />
      </section>
    </main>
  );
}

function ComingSoon({ groups }: { groups: CategoryGroup[] }) {
  const empty = groups
    .flatMap((g) => (g.children.length > 0 ? g.children : [g]))
    .filter((c) => c.product_count === 0);
  if (empty.length === 0) return null;

  return (
    <section className="border-t border-neutral-200 pt-12">
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
