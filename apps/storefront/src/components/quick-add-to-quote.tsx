'use client';

import { useState } from 'react';
import { cn } from '@beco/ui';
import { addLine, type QuoteLine } from '@/lib/quote-list';

/**
 * Add to quote without opening the product.
 *
 * The quote list is the conversion, and a buyer comparing eight stones should
 * not have to open eight pages and come back eight times to build one. This is
 * the same operation as the product page's control, so it uses the same store
 * and the same confirmation.
 *
 * Always visible rather than revealed on hover: hover does not exist on a
 * phone, and most of this traffic is phones.
 */
export function QuickAddToQuote({ line }: { line: Omit<QuoteLine, 'quantity'> }) {
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => { addLine(line, 1); setAdded(true); }}
      aria-label={added ? `${line.name} is on your quote list` : `Add ${line.name} to your quote list`}
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
  );
}
