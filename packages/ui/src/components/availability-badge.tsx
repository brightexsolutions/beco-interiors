import { cn } from '../lib/cn';

/**
 * Availability, as a quiet label rather than a boxed control.
 *
 * `stockQuantity` of 0 is out of stock, even when the availability column
 * still says in stock. NULL quantity means uncounted, so the stored
 * availability stands. Warm Red is not used here: a shop grid of out-of-stock
 * cards must not spend the page's attention budget.
 */
export type Availability = 'in_stock' | 'pre_order' | 'poa';
export type DisplayAvailability = Availability | 'out_of_stock';

export interface AvailabilityBadgeProps {
  availability: Availability;
  /**
   * When the price display already says POA, this badge would repeat it.
   * Pass the price mode and the badge removes itself rather than duplicating.
   */
  priceDisplayMode?: 'fixed' | 'poa' | undefined;
  /** Counted stock. Zero reads as out. Null or omitted leaves availability. */
  stockQuantity?: number | null | undefined;
  className?: string | undefined;
}

export const displayAvailability = (
  availability: Availability,
  stockQuantity?: number | null,
): DisplayAvailability => {
  if (stockQuantity != null && stockQuantity <= 0) return 'out_of_stock';
  return availability;
};

const LABEL: Record<DisplayAvailability, string> = {
  in_stock: 'In stock',
  pre_order: 'Pre-order',
  poa: 'Enquire',
  out_of_stock: 'Out of stock',
};

const DOT: Record<DisplayAvailability, string> = {
  in_stock: 'bg-success',
  pre_order: 'bg-neutral-500',
  poa: 'bg-neutral-300',
  out_of_stock: 'bg-neutral-500',
};

export function AvailabilityBadge({
  availability, priceDisplayMode, stockQuantity, className,
}: AvailabilityBadgeProps) {
  const shown = displayAvailability(availability, stockQuantity);
  if (shown === 'poa' && priceDisplayMode === 'poa') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-ui text-sm text-neutral-700',
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT[shown])} />
      {LABEL[shown]}
    </span>
  );
}
