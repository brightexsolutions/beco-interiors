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
  className?: string;
}

/**
 * A plus and minus either side of the number itself, extracted from the
 * product page's own control once a second, narrower caller needed the exact
 * same stepping rules, half a slab at a time, never below a product's own
 * floor, and drifted the moment it was rewritten by hand a second time rather
 * than shared. Purely presentational: the caller owns the value and what
 * happens to it, so this package never learns what a "quote" is.
 */
export function QuantityStepper({
  value, onChange, step, floor, label = 'Quantity', className,
}: QuantityStepperProps) {
  const id = useId();

  return (
    <div className={cn('flex items-stretch rounded-[2px] border border-neutral-300', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(floor, value - step))}
        disabled={value <= floor}
        aria-label="Decrease quantity"
        className="flex h-11 w-11 items-center justify-center text-xl text-charcoal disabled:opacity-40"
      >
        &minus;
      </button>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={floor}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(floor, Number(e.target.value) || floor))}
        className="h-11 w-14 border-x border-neutral-300 text-center font-ui text-base tabular-nums text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        aria-label="Increase quantity"
        className="flex h-11 w-11 items-center justify-center text-xl text-charcoal"
      >
        +
      </button>
    </div>
  );
}
