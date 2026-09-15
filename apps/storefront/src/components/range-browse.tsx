import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@beco/ui';
import { blurProps, primaryImage, type CategoryGroup, type CatalogueProduct } from '@/lib/products';

/**
 * Browse by range, which is the taxonomy made visible.
 *
 * The shop offered fifteen flat facets in a row, which asks the reader to
 * already know that "Bamboo Veneer Wall Panels" is the thing they want. Nobody
 * arrives thinking that. They arrive wanting panels.
 *
 * So the six top level ranges lead, each showing the ranges underneath it, and
 * the facets narrow from there. The children are LINKS rather than decoration,
 * because a specifier who does know what they want should not have to go
 * through the group page to reach the range.
 *
 * A range with no photography yet still gets a tile. Hiding it would present
 * Beco as a stone supplier with a sideline in handles, which is the same
 * reason D47 seeded the whole taxonomy rather than the part with pictures.
 */
export function RangeBrowse({
  groups, products, className,
}: {
  groups: CategoryGroup[];
  products: CatalogueProduct[];
  className?: string | undefined;
}) {
  // One representative photograph per range, taken from the first product in
  // its subtree that actually has one. `hero_image` on the category is still
  // null everywhere, and inventing a stock photograph for a range Beco has not
  // shot would be exactly the thing the gallery page is a corrective to.
  const coverFor = (group: CategoryGroup) => {
    const slugs = new Set([group.slug, ...group.children.map((c) => c.slug)]);
    return products
      .filter((p) => (p.category ? slugs.has(p.category.slug) : false))
      .map(primaryImage)
      .find((img) => img !== undefined);
  };

  return (
    <section className={className}>
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px w-8 bg-warm-red" />
        <h2 className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Browse by range
        </h2>
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, i) => {
          const cover = coverFor(group);
          return (
            <Reveal key={group.id} delay={(i % 3) * 60}>
              <article className="group/tile flex h-full flex-col">
                <Link
                  href={`/shop/${group.slug}`}
                  className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-warm-red"
                >
                  <div className="relative aspect-[5/3] w-full overflow-hidden bg-charcoal">
                    {cover ? (
                      <Image
                        src={cover.path}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        {...blurProps(cover)}
                        className="object-cover transition-transform duration-[900ms] ease-brand group-hover/tile:scale-[1.04]"
                      />
                    ) : (
                      // Not a grey box with an icon in it. A charcoal
                      // specimen plate, named top and bottom, reads as
                      // deliberate, which is the truth: the stock is real,
                      // the photograph is not taken yet. Same treatment as
                      // an unphotographed product card, so the whole site
                      // handles "no shot yet" one way.
                      <div className="absolute inset-0 flex flex-col justify-between p-5">
                        <span className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-high-vis-white/45">
                          In the showroom
                        </span>
                        <p className="font-display text-2xl leading-tight text-high-vis-white/75">
                          {group.name}
                        </p>
                      </div>
                    )}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                    />
                  </div>

                  <div className="mt-4 flex items-baseline justify-between gap-4">
                    <h3 className="font-ui text-base font-semibold uppercase tracking-[0.1em] text-charcoal">
                      {group.name}
                      <span
                        aria-hidden
                        className="ml-3 inline-block h-px w-0 bg-warm-red align-middle transition-all duration-500 ease-brand group-hover/tile:w-8"
                      />
                    </h3>
                    <p className="shrink-0 font-ui text-sm text-neutral-500">
                      {group.total_count > 0 ? `${group.total_count} in stock` : 'In the showroom'}
                    </p>
                  </div>
                </Link>

                {group.children.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    {group.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/shop/${child.slug}`}
                          className="font-ui text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-charcoal hover:underline"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
