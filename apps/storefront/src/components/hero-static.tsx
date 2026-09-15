import Link from 'next/link';
import { buttonClasses, cn } from '@beco/ui';

/**
 * The home hero when there is no photography to run behind it.
 *
 * PinnedHero needs at least one product carrying a slab or application
 * shot, per D79. When the catalogue has none, a fresh environment before
 * the import has run, or a read that came back thin, the page used to
 * open straight into the stat band with no hero at all. This is the
 * guaranteed floor instead: the same eyebrow, headline, lede and calls
 * to action as the real hero, on flat charcoal, so when photography
 * lands the only change a reader sees is a photograph appearing behind
 * words that were already in place.
 *
 * Deliberately static and server rendered: no crossfade timer, no
 * entrance choreography, no gradient. It is a degraded state whose one
 * job is to be solid and instant. The warm red rule is the single
 * accent, the same one every section eyebrow carries.
 */

// Matches PinnedHero's own GRID_INSET so the type column lands in the
// same place whichever hero renders. See its comment for why the lg step
// adds the section gutter on top of the 1380px centering margin.
const GRID_INSET = 'pl-8 sm:pl-10 lg:pl-[calc(max(0px,(100vw-1380px)/2)+3.5rem)]';

export function HeroStatic() {
  return (
    <section
      aria-label="Sintered stone"
      className="beco-hero-bleed relative border-b border-neutral-200 bg-charcoal"
    >
      <div
        className={cn(
          GRID_INSET,
          'beco-hero-content-top relative flex min-h-[68svh] max-w-[52rem] flex-col justify-center pb-14 pr-6',
          'lg:min-h-[78vh] lg:pr-20',
        )}
      >
        <div className="flex items-center gap-4">
          <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
          <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">
            Sintered stone, stocked in Nairobi
          </p>
        </div>

        <h1 className="mt-6 max-w-[12ch] font-display text-5xl leading-[1.03] tracking-[-0.015em] text-high-vis-white sm:text-6xl xl:text-7xl">
          Surfaces that outlast the room.
        </h1>

        <p className="mt-6 max-w-[54ch] text-base leading-[1.65] text-neutral-300 lg:text-lg">
          Large format slabs for kitchens, bathrooms, feature walls and flooring. Heat, scratch
          and stain resistant, and here in the showroom today.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
            Request a quote
          </Link>
          <Link
            href="/shop"
            className={cn(
              buttonClasses({ variant: 'outline' }),
              'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
            )}
          >
            See the range
          </Link>
        </div>
      </div>
    </section>
  );
}
