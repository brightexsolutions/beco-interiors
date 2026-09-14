'use client';

import { useState } from 'react';
import { QuantityStepper } from '@beco/ui';
import { addLine, removeLine, setQuantity, stepFor, type QuoteLine } from '@/lib/quote-list';

/**
 * Add to quote without opening the product, and once it is on the list, the
 * same slot becomes what adjusts how many and, separately, what takes it
 * back off.
 *
 * Before anything is added this is a single bordered button, an icon and a
 * label: icon only was tried and reported back as unclear on its own.
 * Once added it is replaced by the quantity stepper, the same one the
 * product page uses, and a distinct remove button beside it, rather than
 * asking someone to decrease a slab down through halves to take it off the
 * list. That was tried too: decreasing to zero WAS the removal, and it read
 * as an accident waiting to happen rather than a considered action.
 */
export function QuickAddToQuote({ line }: { line: Omit<QuoteLine, 'quantity'> }) {
  const { step, floor } = stepFor(line.unit);
  const [quantity, setLocalQuantity] = useState(0);

  if (quantity <= 0) {
    return (
      <button
        type="button"
        onClick={() => { addLine(line, 1); setLocalQuantity(1); }}
        aria-label={`Add ${line.name} to your quote list`}
        className="inline-flex h-11 items-center gap-1.5 border border-charcoal px-2.5 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-charcoal transition-colors duration-200 hover:border-warm-red-deep hover:text-warm-red-deep"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current" strokeWidth="1.7">
          <path
            d="M3 5h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L20 8H6.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="20" r="1.3" />
          <circle cx="17" cy="20" r="1.3" />
        </svg>
        Add
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <QuantityStepper
        value={quantity}
        onChange={(next) => {
          setQuantity(line.slug, next);
          setLocalQuantity(next);
        }}
        step={step}
        floor={floor}
        compact
        label={`${line.name}, quantity in your quote list`}
      />
      <button
        type="button"
        onClick={() => { removeLine(line.slug); setLocalQuantity(0); }}
        aria-label={`Remove ${line.name} from your quote list`}
        className="flex h-11 w-9 shrink-0 items-center justify-center border border-neutral-300 text-neutral-500 transition-colors duration-200 hover:border-warm-red-deep hover:text-warm-red-deep"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current" strokeWidth="1.7">
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 .9 12.1a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9L17 7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
