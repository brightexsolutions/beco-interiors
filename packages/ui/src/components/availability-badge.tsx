import { cn } from '../lib/cn';

/**
 * Availability, as a quiet label rather than a boxed control.
 *
 * The first version put every state in a bordered box, which read as a form
 * field rather than a label, and sat next to "Price on application" saying
 * "CALL FOR PRICE", which is the same sentence twice.
 *
 * So: a small dot and a word. And `redundantWith` lets a caller suppress it
 * entirely when the price already carries the message.
 */
export interface AvailabilityBadgeProps {
  availability: 'in_stock' | 'pre_order' | 'poa';
  /**
   * When the price display already says POA, this badge would repeat it.
   * Pass the price mode and the badge removes itself rather than duplicating.
   */
  priceDisplayMode?: 'fixed' | 'poa' | undefined;
  className?: string | undefined;
}

const LABEL = {
  in_stock: 'In stock',
  pre_order: 'Pre-order',
  poa: 'Enquire',
} as const;

const DOT = {
  // Green carries real information: it is here, today, in Nairobi.
  in_stock: 'bg-success',
  pre_order: 'bg-neutral-500',
  poa: 'bg-neutral-300',
} as const;

export function AvailabilityBadge({
  availability, priceDisplayMode, className,
}: AvailabilityBadgeProps) {
  // Saying "Price on application" and "Enquire" together is noise.
  if (availability === 'poa' && priceDisplayMode === 'poa') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-ui text-sm text-neutral-700',
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT[availability])} />
      {LABEL[availability]}
    </span>
  );
}
