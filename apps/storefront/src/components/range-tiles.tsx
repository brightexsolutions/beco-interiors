import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@beco/ui';
import { blurProps, imageForGroup, type CatalogueProduct, type CategoryGroup } from '@/lib/products';
import { RANGE_GROUPS } from '@/lib/ranges';

/**
 * The shop opens on its ranges, not on a grid, D119. One photographic tile
 * per range Beco deals in, in RANGE_GROUPS order so sintered stone leads and
 * a loose Drive folder never becomes a tile. Each is a link to the range's
 * own page, which is where the grid and its controls live. A range with no
 * photography yet shows its name plate on charcoal rather than a guessed
 * stock image, and says so.
 */
export function RangeTiles({
  groups,
  products,
}: {
  groups: CategoryGroup[];
  products: CatalogueProduct[];
}) {
  const tiles = RANGE_GROUPS.flatMap((spec) => {
    const group = groups.find((g) => g.slug === spec.slug);
    return group ? [{ spec, group, cover: imageForGroup(groups, products, spec.slug) }] : [];
  });

  if (tiles.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4" aria-label="Ranges">
      {tiles.map(({ spec, group, cover }, i) => {
        const stocked = group.total_count > 0;
        const subline = stocked
          ? `${group.total_count} in stock${group.children.length > 0 ? `, ${group.children.length} ${group.children.length === 1 ? 'range' : 'ranges'}` : ''}`
          : 'Being photographed';
        return (
          <li key={group.id} className="min-w-0">
            <Reveal delay={(i % 4) * 60}>
              <Link href={`/shop/${group.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-charcoal text-high-vis-white">
                {cover ? (
                  <Image
                    src={cover.path}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    {...blurProps(cover)}
                    className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.04]"
                  />
                ) : null}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-charcoal/10" />
                <span
                  aria-hidden
                  className="absolute right-4 top-4 hidden h-10 w-10 items-center justify-center border border-high-vis-white/50 text-high-vis-white transition-colors group-hover:border-high-vis-white sm:flex"
                >
                  →
                </span>
                <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <span className="block font-display text-2xl leading-[1.05] sm:text-3xl lg:text-4xl">{spec.title}</span>
                  <span className="mt-2 block font-ui text-xs font-semibold uppercase tracking-[0.12em] text-neutral-300 sm:text-sm">
                    {subline}
                  </span>
                </span>
                <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-high-vis-white/10" />
              </Link>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
