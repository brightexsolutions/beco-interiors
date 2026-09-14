'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buttonClasses, cn, QuantityStepper } from '@beco/ui';
import { addLine, lineCount, stepFor, type QuoteLine } from '@/lib/quote-list';

/**
 * The primary conversion action on a product page.
 *
 * It writes to the quote list and says so. A control that advertises adding
 * something and then shows no evidence it happened is the same failure as one
 * that does nothing, so the confirmation is part of the control rather than a
 * toast that may be missed.
 *
 * Once something is on the list, a route straight to `/quote` appears beside
 * the button, so the single item path is add then review then send, and the
 * multi item path is add, keep browsing, then review, without the reader
 * having to hunt for the quote link in the header.
 */
export function AddToQuote({ line }: { line: Omit<QuoteLine, 'quantity'> }) {
  const slab = line.unit === 'per slab';
  const { step, floor } = stepFor(line.unit);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <QuantityStepper
        value={quantity}
        onChange={setQuantity}
        step={step}
        floor={floor}
        label={`Quantity${slab ? ', in half slab steps' : ''}`}
      />
      {slab ? (
        <p className="flex items-center font-ui text-sm text-neutral-500">
          Sold whole. Tell us if a project needs a cut slab.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setCount(lineCount(addLine(line, quantity)));
          setAdded(true);
        }}
        className={cn(buttonClasses({ variant: added ? 'outline' : 'primary' }), 'flex-1 sm:flex-none')}
      >
        {added ? 'Add again' : 'Add to quote'}
      </button>

      {added ? (
        <Link
          href="/quote"
          className={cn(buttonClasses({ variant: 'primary' }), 'flex-1 gap-2 sm:flex-none')}
        >
          Review quote
          <span className="font-semibold tabular-nums">({count})</span>
        </Link>
      ) : null}

      {/* Announced rather than only shown, so the confirmation reaches a
          screen reader too. */}
      <p aria-live="polite" className="sr-only">
        {added ? `${line.name} added. Your quote list has ${count} ${count === 1 ? 'item' : 'items'}.` : ''}
      </p>
    </div>
  );
}
