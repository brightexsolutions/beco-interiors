'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { blurProps } from '@/lib/products';
import type { ProductImage } from '@beco/types';

const AUTO_ADVANCE_MS = 4200;

/**
 * A hero background that crossfades through several real photographs rather
 * than sitting on one, reported directly as wanting the shop's own hero to
 * feel as cinematic as the home page's. The mechanism is the pinned hero's
 * own crossfade, same duration, same easing, `.beco-ambient` for the same
 * slow drift, reused rather than invented fresh so the two heroes move the
 * same way. The first image is `priority`, since it is whichever hero this
 * sits behind uses it as its LCP element.
 *
 * Off entirely under `prefers-reduced-motion`: the first photograph stays
 * on screen, still, rather than cycling for a reader who asked not to see
 * that.
 */
export function CinematicBackground({ images }: { images: ProductImage[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % images.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div aria-hidden className="beco-ambient absolute inset-0">
      {images.map((img, i) => (
        <div
          key={img.path}
          className={[
            'absolute inset-0 transition-opacity duration-[1400ms] ease-brand',
            'motion-reduce:transition-none',
            i === active ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          <Image
            src={img.path}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            {...blurProps(img)}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
