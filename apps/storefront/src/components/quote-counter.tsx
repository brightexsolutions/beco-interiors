'use client';

import { useEffect, useState } from 'react';
import { lineCount, readList, subscribe } from '@/lib/quote-list';

/**
 * The one red element in the header, and only when it has something to say.
 *
 * Rendered as null until mounted: the list lives in localStorage, so the
 * server cannot know the count, and rendering a zero that then jumps to three
 * is a layout shift on every page load.
 */
export function QuoteCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setCount(lineCount(readList()));
    update();
    return subscribe(update);
  }, []);

  if (!count) return null;

  return (
    <span
      aria-label={`${count} item${count === 1 ? '' : 's'} in your quote list`}
      className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-high-vis-white px-1.5 font-ui text-xs font-semibold tabular-nums text-warm-red-deep"
    >
      {count}
    </span>
  );
}
