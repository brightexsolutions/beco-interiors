import { cn } from '../lib/cn';

/**
 * The most important component on the storefront.
 *
 * `price_display_mode` is a separate column from `availability` precisely so
 * this can never be ambiguous. A buyer must never have to work out whether
 * something is priced or not, because ambiguity here costs sales.
 *
 * Three states, and only three:
 *   fixed          KES 25,000  per slab
 *   fixed + sale   KES 22,000  ~~KES 25,000~~  per slab
 *   poa            Price on application
 *
 * Everything launches POA, since no price data exists yet. That is a valid
 * state, not a fallback, and it must read as deliberate rather than broken.
 */
export interface PriceDisplayProps {
  priceDisplayMode: 'fixed' | 'poa';
  price?: number | null;
  compareAtPrice?: number | null;
  unit?: string | null;
  currency?: string;
  size?: 'default' | 'large';
  className?: string;
}

/** KES 25,000. Kenyan formatting, no decimals, since slabs are not priced in cents. */
export const formatPrice = (amount: number, currency = 'KES'): string =>
  `${currency} ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(amount)}`;

export function PriceDisplay({
  priceDisplayMode,
  price,
  compareAtPrice,
  unit,
  currency = 'KES',
  size = 'default',
  className,
}: PriceDisplayProps) {
  const big = size === 'large';

  // POA is a first class state. It says what to do, not what is missing.
  if (priceDisplayMode === 'poa' || price == null) {
    return (
      <p className={cn('font-ui text-charcoal', big ? 'text-lg' : 'text-sm', className)}>
        <span className="font-semibold">Price on application</span>
        {unit ? <span className="text-neutral-500"> {unit}</span> : null}
      </p>
    );
  }

  const onSale = compareAtPrice != null && compareAtPrice > price;

  return (
    <p className={cn('font-ui text-charcoal flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-semibold', big ? 'text-xl' : 'text-base')}>
        {formatPrice(price, currency)}
      </span>
      {onSale ? (
        <span className="text-neutral-500 line-through text-sm">
          {formatPrice(compareAtPrice, currency)}
        </span>
      ) : null}
      {unit ? <span className="text-neutral-500 text-sm">{unit}</span> : null}
    </p>
  );
}
