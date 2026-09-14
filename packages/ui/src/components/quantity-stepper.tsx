'use client';

import { useId } from 'react';
import { cn } from '../lib/cn';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** The amount one press of plus or minus moves by. A property of what is
      being counted, half a slab or one whole handle, never a constant. */
  step: number;
  /** The lowest value the control allows. Not always 1: a slab already in
      someone's list can be brought down to half, never to zero here, since
      zero is a removal, a different operation this control does not do. */
  floor: number;
  /** Screen reader label for the input. "Quantity" on its own reads as
      obvious beside a visible plus and minus; a caller says more when the
      step itself needs explaining, half slab steps rather than whole ones. */
  label?: string;
  /** Narrower buttons and input, height unchanged: the 44px touch target is
      a hard floor, never a compact override, so a caller reaching for less
      bulk on a crowded card only ever gets back some of its own width. */
  compact?: boolean;
  className?: string;
}

const MinusIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 stroke-current" fill="none" strokeWidth="1.8">
    <path d="M5 12h14" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 stroke-current" fill="none" strokeWidth="1.8">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
);

/**
 * A plus and minus either side of the number itself, extracted from the
 * product page's own control once a second, narrower caller needed the exact
 * same stepping rules, half a slab at a time, never below a product's own
 * floor, and drifted the moment it was rewritten by hand a second time rather
 * than shared. Purely presentational: the caller owns the value and what
 * happens to it, so this package never learns what a "quote" is.
 *
 * The plus and minus are real vector glyphs, not the text characters `+` and
 * `-`: every other control on the site draws from the same small set of hand
 * drawn stroke icons, and a bare typographic character sat oddly beside them.
 */
export function QuantityStepper({
  value, onChange, step, floor, label = 'Quantity', compact = false, className,
}: QuantityStepperProps) {
  const id = useId();
  const buttonWidth = compact ? 'w-9' : 'w-11';
  const inputWidth = compact ? 'w-9' : 'w-14';

  return (
    <div className={cn('flex items-stretch rounded-[2px] border border-neutral-300', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(floor, value - step))}
        disabled={value <= floor}
        aria-label="Decrease quantity"
        className={cn('flex h-11 items-center justify-center text-charcoal disabled:opacity-40', buttonWidth)}
      >
        <MinusIcon />
      </button>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={floor}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(floor, Number(e.target.value) || floor))}
        className={cn(
          'h-11 border-x border-neutral-300 text-center font-ui text-base tabular-nums text-charcoal',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red',
          inputWidth,
        )}
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        aria-label="Increase quantity"
        className={cn('flex h-11 items-center justify-center text-charcoal', buttonWidth)}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
