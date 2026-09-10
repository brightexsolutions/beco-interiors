import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { HoverGallery } from './hover-gallery';
import { PriceDisplay } from './price-display';
import { AvailabilityBadge } from './availability-badge';

/**
 * No border. No shadow. No lift on hover.
 *
 * A shadow lift on a white card is the framework default and reads as one.
 * Instead: a fixed 4:5 frame that crops rather than resizes, the image scaling
 * inside it on hover, and a red hairline drawing under the name. The frame
 * never moves, so a grid of these stays completely still.
 */
export interface ProductCardProps {
  name: string;
  href: string;
  /** Rendered by the caller, so this package stays free of next/image. */
  image?: ReactNode | undefined;
  /**
   * The product's other photographs. When given, the frame cycles through
   * them while the pointer is on the card, so the difference between a slab
   * and the same stone in a finished room is visible without opening the page.
   */
  images?: ReactNode[] | undefined;
  /**
   * A control rendered over the card, typically add to quote. Kept as a slot
   * so this package never learns about the quote list.
   *
   * The card is NOT a single anchor any more: a button inside a link is
   * invalid, and it was the reason a card could not carry an action. The link
   * is stretched across the card instead and this sits above it.
   */
  action?: ReactNode | undefined;
  priceDisplayMode: 'fixed' | 'poa';
  price?: number | null | undefined;
  compareAtPrice?: number | null | undefined;
  unit?: string | null | undefined;
  availability?: 'in_stock' | 'pre_order' | 'poa' | undefined;
  badge?: 'hot' | 'new' | 'sale' | 'clearance' | null | undefined;
  /**
   * The frame's shape. `portrait` is the default 4:5 grid card. `wide` is for
   * a lead tile spanning more than one column, where a 4:5 crop would be
   * absurdly tall. The frame is fixed either way, so the grid never shifts.
   */
  frame?: 'portrait' | 'wide' | undefined;
  /**
   * Applied to the frame that holds the image, so a page can add entrance or
   * parallax motion without this component knowing what those are.
   */
  imageClassName?: string | undefined;
  className?: string | undefined;
}

const FRAME = {
  portrait: 'aspect-[4/5]',
  wide: 'aspect-[4/5] sm:aspect-[16/11]',
} as const;

const BADGE_LABEL = { hot: 'Popular', new: 'New', sale: 'Sale', clearance: 'Clearance' } as const;

export function ProductCard({
  name, href, image, priceDisplayMode, price, compareAtPrice, unit,
  availability = 'poa', badge, frame = 'portrait', imageClassName, action, images,
  className,
}: ProductCardProps) {
  const frames = images && images.length > 1 ? images : null;
  const hasVisual = Boolean(frames || image);

  return (
    // cursor-pointer on the whole card: the stretched link covers all of it,
    // so every part of it navigates and every part of it should say so.
    <div className={cn('group relative cursor-pointer', className)}>
      {/* The inset hairline is not decoration: Pure White is a white stone
          photographed on white, so without an edge its card looks like an
          image that failed to load. The card itself still carries no border. */}
      <div className={cn(
        'relative w-full overflow-hidden',
        hasVisual ? 'bg-neutral-100' : 'bg-charcoal',
        'after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15',
        FRAME[frame], imageClassName,
      )}>
        <div className="h-full w-full transition-transform duration-[600ms] ease-brand group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          {frames ? (
            <HoverGallery frames={frames} className="absolute inset-0" />
          ) : hasVisual ? (
            image
          ) : (
            /* No photograph yet. Not a blank grey rectangle: a charcoal
               specimen plate with the stone named on it, the same
               treatment the range tiles use, so an unphotographed
               product reads as awaiting its shot rather than as broken.
               aria-hidden: the heading link below is the real accessible
               name, so a screen reader does not hear the product twice. */
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
              <span className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-high-vis-white/45">
                In the showroom
              </span>
              <span className="font-display text-2xl leading-[1.1] text-high-vis-white/75">
                {name}
              </span>
            </div>
          )}
        </div>
        {badge ? (
          <span className="absolute left-0 top-0 bg-warm-red-deep px-2 py-1 font-ui text-xs font-semibold uppercase tracking-[0.09em] text-high-vis-white">
            {BADGE_LABEL[badge]}
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <h3 className={cn('font-display leading-tight text-charcoal',
                          frame === 'wide' ? 'text-2xl' : 'text-xl')}>
          {/* The stretched link: the whole card navigates, while the action
              below sits above it and does not. */}
          <a href={href} className="relative inline-block after:absolute after:inset-0 focus:outline-none focus-visible:underline focus-visible:decoration-warm-red focus-visible:underline-offset-4">
            {name}
            {/* The hover affordance: a hairline draws in, nothing moves. */}
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-warm-red transition-transform duration-300 ease-brand group-hover:scale-x-100 motion-reduce:transition-none"
            />
          </a>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <PriceDisplay
            priceDisplayMode={priceDisplayMode}
            price={price}
            compareAtPrice={compareAtPrice}
            unit={unit}
            vatInclusive
          />
          <AvailabilityBadge availability={availability} priceDisplayMode={priceDisplayMode} />
        </div>

        {/* Above the stretched link, so pressing it adds rather than
            navigates. */}
        {action ? <div className="relative z-10 mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
