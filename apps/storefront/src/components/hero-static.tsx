import Link from 'next/link';
import { buttonClasses, cn } from '@beco/ui';
import { HERO_GRID_INSET } from '@/lib/layout';

/**
 * The home hero when there is no photography to run behind it.
 *
 * `CinematicHero` needs at least one room in `HERO_ROOMS`, D120. If that
 * list is ever empty, this is the guaranteed floor instead of no hero at
 * all: the same eyebrow, headline and two actions as the real hero, on
 * flat charcoal, so when the rooms come back the only change a reader sees
 * is a photograph appearing behind words that were already in place.
 *
 * Deliberately static and server rendered: no crossfade timer, no
 * entrance choreography, no gradient. It is a degraded state whose one
 * job is to be solid and instant. No rules or separators, D121, the
 * same as the real hero.
 */

export function HeroStatic() {
  return (
    <section
      aria-label="Beco Interiors"
      className="beco-hero-bleed relative bg-charcoal"
    >
      <div
        className={cn(
          HERO_GRID_INSET,
          'beco-hero-content-top relative flex min-h-[68svh] max-w-[52rem] flex-col justify-center pb-14 pr-6',
          'lg:min-h-[78vh] lg:pr-20',
        )}
      >
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
          Beco Interiors, Nairobi
        </p>

        <h1 className="mt-6 max-w-[14ch] font-display text-5xl leading-[1.03] tracking-[-0.015em] text-high-vis-white xl:text-6xl">
          The room starts with the surface.
        </h1>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/shop" className={buttonClasses({ variant: 'primary' })}>
            View products
          </Link>
          <Link
            href="/contact"
            className={cn(
              buttonClasses({ variant: 'outline' }),
              'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
            )}
          >
            Plan a visit
          </Link>
        </div>
      </div>
    </section>
  );
}
