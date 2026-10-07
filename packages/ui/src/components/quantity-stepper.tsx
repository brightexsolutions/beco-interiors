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
  /** Alias for `min`, kept for callers that name a product's own floor. */
  floor?: number | undefined;
  /** Shown beside the control, for example "per slab". */
  unit?: string | null | undefined;
  /** Lets the value be typed as well as stepped. Off by default. */
  editable?: boolean | undefined;
  /** Narrower buttons and input, height unchanged: the 44px touch target is
      a hard floor, never a compact override. */
  compact?: boolean | undefined;
  /** Both buttons and the typed field off, for a quantity that cannot change
      (a closed quote, D132). Pair it with `describedBy` so the reason is read
      out: a control disabled with no reason given is not allowed. */
  disabled?: boolean | undefined;
  /** Id of the visible element that says why the control is disabled. */
  describedBy?: string | undefined;
  className?: string | undefined;
}

// A run of 0.5 steps can land on 1.7999999999999998. Nothing sold here is
// priced or measured finer than a half unit, so two decimal places is exact.
const round = (n: number): number => Math.round(n * 100) / 100;

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

const stepperButton = (compact: boolean) => cn(
  'flex h-11 shrink-0 items-center justify-center text-charcoal',
  'transition-colors duration-200 ease-brand hover:bg-neutral-50 hover:text-warm-red-deep',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-warm-red',
  'disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-charcoal',
  compact ? 'w-9' : 'w-11',
);

export function QuantityStepper({
  value, onChange, label, step = 1, min, floor, unit, editable = false, compact = false, disabled = false,
  describedBy, className,
}: QuantityStepperProps) {
  const id = useId();
  const bound = min ?? floor ?? 0;
  const atFloor = value <= bound;
  const inputWidth = compact ? 'w-[2.25rem]' : 'min-w-[3.25rem]';

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className={cn('flex items-stretch rounded-control border border-neutral-300 bg-high-vis-white', compact && 'flex-nowrap')}>
        <button
          type="button"
          onClick={() => onChange(Math.max(bound, round(value - step)))}
          disabled={disabled || atFloor}
          aria-label={`Decrease quantity of ${label}`}
          aria-describedby={describedBy}
          className={stepperButton(compact)}
        >
          <MinusIcon />
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
              min={bound}
              step={step}
              value={value}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(e) => onChange(Math.max(bound, Number(e.target.value) || bound))}
              className={cn(
                'h-11 border-x border-neutral-300 bg-transparent px-1 text-center font-ui text-base tabular-nums text-charcoal',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-red',
                '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
                inputWidth,
              )}
            />
          </>
        ) : (
          <span
            aria-label={`${label} quantity, ${value}`}
            className={cn(
              'flex h-11 items-center justify-center border-x border-neutral-300 px-1 font-ui text-base tabular-nums text-charcoal',
              inputWidth,
            )}
          >
            {value}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(round(value + step))}
          disabled={disabled}
          aria-label={`Increase quantity of ${label}`}
          aria-describedby={describedBy}
          className={stepperButton(compact)}
        >
          <PlusIcon />
        </button>
      </div>
      {unit ? <span className="font-ui text-sm opacity-70">{unit}</span> : null}
    </div>
  );
}
