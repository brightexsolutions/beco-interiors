import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyState, buttonClasses } from '@beco/ui';
import { ProductGrid } from '@/components/product-grid';
import { RangeBrowse } from '@/components/range-browse';
import { ShopControls, type Facet, type FacetGroup } from '@/components/shop-controls';
import {
  getPublishedProducts, getCategoryTree, primaryImage, blurProps,
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
  const hero = all.map(primaryImage).find((img) => img !== undefined);
  const ranges = groups.reduce((n, g) => n + Math.max(1, g.children.length), 0);

  return (
    <main>
      {/* --- A slim banner, not an opening scene. This used to be a full
              screen eyebrow, heading, lede and stat band, which reads well on
              a page selling the idea of Beco but works against a reader who
              already knows they want the shop and is here to find items,
              reported directly. One line of identity, the facts folded into
              the same row instead of their own block, and no lede: the value
              proposition belongs to / and /about, not to a page whose whole
              job is getting out of the way of the grid. --- */}
      <section className="relative border-b border-neutral-200 bg-charcoal">
        {hero ? (
          <div className="absolute inset-0">
            <Image
              src={hero.path}
              alt=""
              fill
              priority
              sizes="100vw"
              {...blurProps(hero)}
              className="object-cover opacity-20"
            />
          </div>
        ) : null}

        {/* Verified against the charcoal blend rather than assumed, per the
            design rules: even a near white source photo at this opacity
            over #101820 still leaves white text at 8+:1, well past the 4.5
            AA floor. The shadow is a second, independent guarantee, a
            physical dark halo behind the text that holds regardless of
            what any given photo or browser does with the blend. text-shadow
            is inherited, so it is set once here rather than on every child. */}
        <div
          className="relative mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 py-8 sm:py-9"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-px w-5 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Everything in stock
              </p>
            </div>
            <h1 className="mt-1.5 font-display text-2xl leading-tight text-high-vis-white sm:text-3xl">
              Interior finishing materials.
            </h1>
          </div>

          <dl className="flex flex-wrap gap-x-6 gap-y-1 font-ui text-sm text-neutral-300">
            <CompactFact term="Products" value={String(all.length)} />
            <CompactFact term="Ranges" value={String(ranges)} />
            <CompactFact term="Collection" value="Urban Square" />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1380px] px-6 py-16 sm:py-20">
        {/* Browsing comes before filtering. A reader who knows what they want
            uses the bar; everyone else needs to see the shape of the range. */}
        <RangeBrowse groups={groups} products={all} className="mb-16" />

        <ShopControls
          groups={facetGroups}
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
                said plainly so nobody thinks they are on the floor today. Only
                when the reader is looking at everything: under a filter it is
                noise about things they did not ask for. --- */}
        {!filtered ? <ComingSoon groups={groups} /> : null}
      </div>
    </main>
  );
}

/** One line each, not the display-scale numerals the old stat band counted
    up: this banner's whole job now is staying out of the way of the grid. */
function CompactFact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="inline text-neutral-400">{term}</dt>{' '}
      <dd className="inline font-semibold text-high-vis-white">{value}</dd>
    </div>
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
