'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ProductImage } from '@beco/types';
import { blurProps } from '@/lib/products';

/**
 * A full bleed photograph with one enormous outlined word across it, and both
 * the word and the photograph keep changing together.
 *
 * The type is knocked out rather than filled: an outline lets the photograph
 * read through the letterforms, which is the whole effect. A solid fill at
 * this size would just be a bar of colour across the image.
 *
 * The words are places and rooms Beco actually supplies, so the sequence says
 * something rather than being decoration that happens to move. The images
 * behind them used to be a single static photograph for the whole section, so
 * "KITCHENS" and "OFFICES" sat over the exact same picture, which reads as
 * unfinished the moment you notice it.
 *
 * **What the images are NOT claimed to be:** a specific photograph of a
 * specific room type. Nothing in the catalogue tags an installation shot as a
 * kitchen, a bathroom or an office, and inventing that label per photo is
 * exactly the kind of unverifiable claim this project has been burned by
 * before. So the photographs cycle in step with the words, which gives the
 * section real variety and keeps it honest: they are real Beco installations,
 * shown as a set, not captioned as the word above them.
 *
 * `images` is optional and, when given, must be the same length as `words`.
 * Without it the section behaves exactly as before, one still photograph.
 *
 * The first word is rendered on the server and is real text in the heading, so
 * a crawler and a reduced-motion reader both get a sentence rather than an
 * empty frame. Under prefers-reduced-motion neither the words nor the
 * photographs cycle, and the first of each is what stays on screen.
 */
export function RotatingStatement({ words, images, intervalMs = 2600 }: {
  words: string[];
  images?: ProductImage[];
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
    <>
      {images ? (
        <div aria-hidden className="absolute inset-0">
          {images.map((img, i) => (
            <Image
              key={img.path}
              src={img.path}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              {...blurProps(img)}
              // Opacity has exactly ONE source here, the ternary. It was
              // previously also hardcoded into the base string as
              // `opacity-70`, so an inactive layer carried BOTH `opacity-70`
              // and `opacity-0` at once. Tailwind resolves two utilities for
              // the same property by their order in the compiled stylesheet,
              // not by where they sit in this string, so every layer froze
              // at whichever value happened to win that tie, and the
              // photograph never visibly changed even though the index was
              // updating correctly underneath it.
              className={[
                'object-cover transition-opacity duration-[1400ms] ease-brand',
                'motion-reduce:transition-none',
                i === index ? 'opacity-70' : 'opacity-0',
              ].join(' ')}
            />
          ))}
        </div>
      ) : null}

      <span className="relative block" aria-live="off">
        {/* Every word is laid on top of the others, so the box never resizes
            as a longer one arrives and the section cannot shift the page. */}
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
    </>
  );
}
