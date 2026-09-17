'use client';

import { useId } from 'react';
import { cn } from '../lib/cn';

/**
 * The plus and minus control behind every quantity in the quote flow.
 *
 * Written twice before this, once on the product page and once in the quote
 * list, and the two copies had already drifted: one had a focus ring on its
 * number field and one did not. Rule 5 exists for exactly this.
 *
 * 44px targets throughout. The dashboard's 12 tap budget on a new quote
 * depends on this being fast to use with a thumb, never the keyboard.
 */
export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** What is being counted, for example a product name. Builds every aria-label. */
  label: string;
  step?: number | undefined;
  /** The lowest value the control will reach. Decrementing past it is a no-op. */
  min?: number | undefined;
  /** Shown beside the control, for example "per slab". */
  unit?: string | null | undefined;
  /** Lets the value be typed as well as stepped. Off by default. */
  editable?: boolean | undefined;
  className?: string | undefined;
}

// A run of 0.5 steps can land on 1.7999999999999998. Nothing sold here is
// priced or measured finer than a half unit, so two decimal places is exact.
const round = (n: number): number => Math.round(n * 100) / 100;

const stepperButton = [
  'flex h-11 w-11 shrink-0 items-center justify-center text-xl text-charcoal',
  'transition-colors duration-200 ease-brand hover:bg-neutral-50 hover:text-warm-red-deep',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-warm-red',
  'disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal',
].join(' ');

export function QuantityStepper({
  value, onChange, label, step = 1, min = 0, unit, editable = false, className,
}: QuantityStepperProps) {
  const id = useId();
  const atFloor = value <= min;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="flex items-stretch border border-neutral-300 bg-high-vis-white">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, round(value - step)))}
          disabled={atFloor}
          aria-label={`Decrease quantity of ${label}`}
          className={stepperButton}
        >
          &minus;
        </button>

        {editable ? (
          <>
            <label className="sr-only" htmlFor={id}>
              {label} quantity
            </label>
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={min}
              step={step}
              value={value}
              onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
              // No fixed width: a slab quantity is one decimal digit but a
              // box or handle count can run to three, and a hardcoded w-14
              // clipped the third digit. min-w keeps it from looking cramped
              // at "1". The three [&::...] rules and [-moz-appearance] drop
              // the browser's own up/down spinner, which this control
              // already provides with its own buttons: left in place, the
              // native spinner ate into the same fixed-width box the digits
              // needed, which is what was actually clipping the value.
              className="h-11 min-w-[3.25rem] border-x border-neutral-300 bg-transparent px-1 text-center font-ui text-base tabular-nums text-charcoal [-moz-appearance:textfield] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-red [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
            />
          </>
        ) : (
          <span
            aria-label={`${label} quantity, ${value}`}
            className="flex h-11 min-w-[3.25rem] items-center justify-center border-x border-neutral-300 px-1 font-ui text-base tabular-nums text-charcoal"
          >
            {value}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(round(value + step))}
          aria-label={`Increase quantity of ${label}`}
          className={stepperButton}
        >
          +
        </button>
      </div>
      {/* No fixed grey: a flat neutral tone that reads as muted on a white
          page reads as invisible on the quote list's charcoal panel, and no
          single shade clears AA against both a light and a dark host.
          Inheriting the ambient text colour and dimming it stays legible
          wherever this control is dropped, the same trick ProductCard's own
          charcoal plate uses for its secondary line. */}
      {unit ? <span className="font-ui text-sm opacity-70">{unit}</span> : null}
    </div>
  );
}
