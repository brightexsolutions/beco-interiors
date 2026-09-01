import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
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
  className?: string | undefined;
}

const FRAME = {
  portrait: 'aspect-[4/5]',
  wide: 'aspect-[4/5] sm:aspect-[16/11]',
} as const;

const BADGE_LABEL = { hot: 'Popular', new: 'New', sale: 'Sale', clearance: 'Clearance' } as const;

export function ProductCard({
  name, href, image, priceDisplayMode, price, compareAtPrice, unit,
  availability = 'poa', badge, frame = 'portrait', className,
}: ProductCardProps) {
  return (
    <a href={href} className={cn('group block focus:outline-none', className)}>
      <div className={cn('relative w-full overflow-hidden bg-neutral-100', FRAME[frame])}>
        <div className="h-full w-full transition-transform duration-[600ms] ease-brand group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
          {image}
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
          <span className="relative inline-block">
            {name}
            {/* The hover affordance: a hairline draws in, nothing moves. */}
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-warm-red transition-transform duration-300 ease-brand group-hover:scale-x-100 motion-reduce:transition-none"
            />
          </span>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <PriceDisplay
            priceDisplayMode={priceDisplayMode}
            price={price}
            compareAtPrice={compareAtPrice}
            unit={unit}
          />
          <AvailabilityBadge availability={availability} priceDisplayMode={priceDisplayMode} />
        </div>
      </div>
    </a>
  );
}
