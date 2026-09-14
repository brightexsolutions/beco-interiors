'use client';

import { useState } from 'react';
import { cn, QuantityStepper } from '@beco/ui';
import { addLine, stepFor, type QuoteLine } from '@/lib/quote-list';

/**
 * Add to quote without opening the product, quantity included.
 *
 * The quote list is the conversion, and a buyer comparing eight stones should
 * not have to open eight pages and come back eight times to build one. This
 * writes through the same `addLine` the product page's own control uses, and
 * shares its stepping rules via `stepFor`, so a slab steps in halves here too
 * rather than only once you have opened it.
 *
 * Reported directly: a shopper wants to say "I need three of these" before
 * they have committed to opening the product, not only after. The stepper
 * used to not exist here at all, always adding exactly one, which is why.
 *
 * The trigger is text and a small bordered glyph, not a filled button: the
 * primary button colour is Warm Red, rationed by the brand guideline to
 * three or four appearances a page, and a grid shows eight or twelve of
 * these at once. A solid red button on every card was tried and reported
 * back directly as looking cheap, "many red buttons", which the guideline's
 * own rationing already predicts. Charcoal at rest, red only on hover, is
 * the same restrained treatment this control always used; it just gained a
 * quantity above it.
 *
 * Always visible rather than revealed on hover: hover does not exist on a
 * phone, and most of this traffic is phones. Stacked, the stepper above the
 * trigger, because the card is a fraction of the product page's own width
 * and a single row wide enough for both never fit one that also had to stay
 * inside the 44px touch target floor.
 */
export function QuickAddToQuote({ line }: { line: Omit<QuoteLine, 'quantity'> }) {
  const { step, floor } = stepFor(line.unit);
  // Opens on one whole unit regardless of the floor, the same default
  // AddToQuote uses and for the same reason: one is the default way
  // anything, a slab included, is actually sold.
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2.5">
      <QuantityStepper value={quantity} onChange={setQuantity} step={step} floor={floor} />
      <button
        type="button"
        onClick={() => { addLine(line, quantity); setAdded(true); }}
        aria-label={added ? `${line.name} is on your quote list` : `Add ${quantity} of ${line.name} to your quote list`}
        className={cn(
          'inline-flex min-h-11 cursor-pointer items-center gap-2 font-ui text-sm font-semibold uppercase tracking-[0.1em]',
          'transition-colors duration-200',
          added ? 'text-neutral-500' : 'text-charcoal hover:text-warm-red-deep',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-6 w-6 items-center justify-center border transition-colors duration-200',
            added ? 'border-neutral-300 text-neutral-500' : 'border-charcoal',
          )}
        >
          {added ? '✓' : '+'}
        </span>
        {added ? 'On your list' : 'Add to quote'}
      </button>
      <p aria-live="polite" className="sr-only">
        {added ? `${quantity} ${quantity === 1 ? 'unit' : 'units'} of ${line.name} added to your quote list.` : ''}
      </p>
    </div>
  );
}
