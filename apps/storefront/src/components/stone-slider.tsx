'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@beco/ui';
import { blurProps, type StoneSlide } from '@/lib/products';

export type { StoneSlide };

/**
 * A small frame that crosses through several real stones on its own,
 * reported directly as the thing to put in the empty column beside the
 * About page's opening text.
 *
 * The same crossfade `RotatingStatement` already uses, opacity as the ONE
 * source of truth per layer rather than a hardcoded value plus a ternary
 * fighting over it, which is the exact bug D67 found the first time this
 * pattern was written. Decorative end to end: `aria-hidden` on the whole
 * thing, matching how `RotatingStatement`'s own photographs are marked,
 * since the names are a caption for a sighted reader watching it change,
 * not information a page would be incomplete without.
 */
export function StoneSlider({
  slides, intervalMs = 2600, className,
}: {
  slides: StoneSlide[];
  intervalMs?: number;
  className?: string | undefined;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div
      aria-hidden
      className={cn('relative aspect-[4/5] w-full overflow-hidden bg-neutral-100', className)}
    >
      {slides.map((slide, i) => (
        <Image
          key={slide.image.path}
          src={slide.image.path}
          alt=""
          fill
          priority={i === 0}
          sizes="(max-width: 1024px) 60vw, 22rem"
          {...blurProps(slide.image)}
          className={cn(
            'object-cover transition-opacity duration-[1200ms] ease-brand motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 bg-charcoal/85 px-4 py-3">
        <span className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white">
          {slides[index]!.name}
        </span>
      </div>
    </div>
  );
}
