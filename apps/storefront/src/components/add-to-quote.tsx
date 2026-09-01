'use client';

import { useState } from 'react';
import { buttonClasses, cn } from '@beco/ui';
import { addLine, type QuoteLine } from '@/lib/quote-list';

/**
 * The primary conversion action on a product page.
 *
 * It writes to the quote list and says so. A control that advertises adding
 * something and then shows no evidence it happened is the same failure as one
 * that does nothing, so the confirmation is part of the control rather than a
 * toast that may be missed.
 */
export function AddToQuote({ line }: { line: Omit<QuoteLine, 'quantity'> }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className="flex items-stretch rounded-[2px] border border-neutral-300">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
          className="flex h-11 w-11 items-center justify-center text-xl text-charcoal disabled:opacity-40"
        >
          &minus;
        </button>
        <label className="sr-only" htmlFor="qty">Quantity</label>
        <input
          id="qty"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="h-11 w-14 border-x border-neutral-300 text-center font-ui text-base tabular-nums text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red"
        />
        <button
          type="button"
          onClick={() => setQuantity((q) => q + 1)}
          aria-label="Increase quantity"
          className="flex h-11 w-11 items-center justify-center text-xl text-charcoal"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          addLine(line, quantity);
          setAdded(true);
        }}
        className={cn(buttonClasses({ variant: 'primary' }), 'flex-1 sm:flex-none')}
      >
        {added ? 'Added to your list' : 'Add to quote'}
      </button>

      {/* Announced rather than only shown, so the confirmation reaches a
          screen reader too. */}
      <p aria-live="polite" className="sr-only">
        {added ? `${line.name} added to your quote list` : ''}
      </p>
    </div>
  );
}
