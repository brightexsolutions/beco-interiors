'use client';

import { useEffect, useState } from 'react';

/**
 * A full bleed photograph with one enormous outlined word across it, and the
 * word keeps changing.
 *
 * The type is knocked out rather than filled: an outline lets the photograph
 * read through the letterforms, which is the whole effect. A solid fill at
 * this size would just be a bar of colour across the image.
 *
 * The words are places and rooms Beco actually supplies, so the sequence says
 * something rather than being decoration that happens to move.
 *
 * The first word is rendered on the server and is real text in the heading, so
 * a crawler and a reduced-motion reader both get a sentence rather than an
 * empty frame. Under prefers-reduced-motion the cycling never starts.
 */
export function RotatingStatement({ words, intervalMs = 2600 }: {
  words: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className="relative block" aria-live="off">
      {/* Every word is laid on top of the others, so the box never resizes as
          a longer one arrives and the section cannot shift the page. */}
      <span aria-hidden className="invisible block">
        {words.reduce((a, b) => (a.length >= b.length ? a : b))}
      </span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={[
            'beco-outline absolute inset-0 flex items-center justify-center',
            'transition-opacity duration-[900ms] ease-brand motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
