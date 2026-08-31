import { cn } from '../lib/cn';

/**
 * Warm Red is reserved for genuine attention, never decoration. So only the
 * state that actually needs a buyer to act carries it.
 */
export interface AvailabilityBadgeProps {
  availability: 'in_stock' | 'pre_order' | 'poa';
  className?: string | undefined;
}

const LABEL = {
  in_stock: 'In stock',
  pre_order: 'Pre-order',
  poa: 'Call for price',
} as const;

const STYLE = {
  // Quiet: stock is the expected case and does not need to shout.
  in_stock: 'text-charcoal border-neutral-300',
  pre_order: 'text-neutral-700 border-neutral-300',
  // The one that changes what a buyer does next.
  poa: 'text-warm-red-deep border-warm-red-deep',
} as const;

export function AvailabilityBadge({ availability, className }: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1',
        'font-ui text-xs font-semibold uppercase tracking-[0.09em]',
        STYLE[availability],
        className,
      )}
    >
      {LABEL[availability]}
    </span>
  );
}
