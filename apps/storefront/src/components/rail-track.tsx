'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { cn } from '@beco/ui';
import { blurProps, primaryImage, type CatalogueProduct } from '@/lib/products';

/**
 * The rail's row, and the part of it that is genuinely interactive.
 *
 * Split out of `SlabRail` so the section heading and the "Browse the range"
 * link stay server rendered. This is the one piece of the rail that needs a
 * script: everything else is still free.
 *
 * SELF DRIVING, real scroll position this time rather than a CSS transform.
 * The rail used to run on a pure CSS keyframe, `translateX` back and forth,
 * which cost nothing on the main thread but could not be nudged: a button
 * click has nowhere to attach to a `@keyframes` animation mid flight. Arrow
 * controls need `scrollLeft`, so the track drives that directly instead, at a
 * frame rate cheap enough not to matter, and native `overflow-x-auto` is what
 * makes a click, a drag and the auto advance all agree on the same position.
 *
 * Paused on hover and on focus within, same as before: a row that keeps
 * moving while you reach for a card is an advertisement, not a catalogue. An
 * arrow press also holds it for a couple of seconds afterward, so pressing
 * "next" is not immediately undone by the row resuming under your thumb.
 *
 * `prefers-reduced-motion: reduce` turns the auto advance off entirely. The
 * arrows still work: reduced motion asks for no motion the reader did not
 * choose, not for a row that cannot be moved at all.
 */
const STAGGER = ['lg:mt-0', 'lg:mt-8', 'lg:mt-3', 'lg:mt-12'] as const;

export function RailTrack({ products }: { products: CatalogueProduct[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const pausedRef = useRef(false);
  const heldUntilRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const desktop = window.matchMedia('(min-width: 1024px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;

    const step = () => {
      raf = requestAnimationFrame(step);
      if (!desktop.matches || reduced.matches) return;
      if (pausedRef.current || Date.now() < heldUntilRef.current) return;

      const max = track.scrollWidth - track.clientWidth;
      if (max <= 0) return;
      // About 70 seconds end to end, close to the pace the CSS version ran
      // at, tuned so a reader has time to actually read a plate as it passes.
      let next = track.scrollLeft + directionRef.current * (max / (70 * 60));
      if (next >= max) { next = max; directionRef.current = -1; }
      else if (next <= 0) { next = 0; directionRef.current = 1; }
      track.scrollLeft = next;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrollByArrow = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.82, behavior: 'smooth' });
    // Held rather than instantly resumed, so the row does not immediately
    // creep back over a card the reader just chose to bring into view.
    heldUntilRef.current = Date.now() + 2600;
  };

  return (
    <div
      className="group/rail relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocus={() => { pausedRef.current = true; }}
      onBlur={() => { pausedRef.current = false; }}
    >
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="The full range, scrollable"
        className="beco-marquee-viewport flex w-full gap-8 overflow-x-auto pb-4 pl-6 pr-6 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-warm-red lg:gap-10 lg:pl-[max(1.5rem,calc((100vw-1380px)/2))] lg:pr-[max(1.5rem,calc((100vw-1380px)/2))] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, i) => {
          const img = primaryImage(product);
          return (
            <li
              key={product.id}
              className={`beco-marquee-item beco-rail-card w-[68vw] shrink-0 will-change-transform sm:w-[40vw] lg:w-[min(23vw,19rem)] ${STAGGER[i % STAGGER.length]}`}
            >
              <Link href={`/product/${product.slug}`} className="group block">
                {/* Fixed height rather than a fixed ratio, so the whole card
                    including its plate always fits the row's own height. */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 shadow-[0_16px_44px_rgba(16,24,32,0.14)] lg:aspect-auto lg:h-[min(44vh,25rem)]">
                  {img ? (
                    <Image
                      src={img.path}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 68vw, (max-width: 1024px) 40vw, 25vw"
                      {...blurProps(img)}
                      className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.05] motion-reduce:transition-none"
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-charcoal/15"
                  />
                </div>

                <div className="flex items-baseline justify-between gap-4 bg-charcoal px-5 py-4 text-high-vis-white transition-colors duration-300 group-hover:bg-neutral-950">
                  <div className="min-w-0">
                    <p className="truncate font-ui text-sm font-semibold uppercase tracking-[0.14em]">
                      {product.name}
                    </p>
                    <p className="mt-1 truncate font-ui text-sm text-neutral-500">
                      {product.category?.name ?? 'In stock'}
                    </p>
                  </div>
                  <p className="shrink-0 font-ui text-sm font-semibold tabular-nums text-neutral-500">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* --- Arrow controls, desktop only. Hidden until the row is hovered
              or holds focus, so they do not sit permanently over the
              photographs: this is a catalogue reaching for restraint, not a
              carousel advertising its own controls. --- */}
      <RailArrow direction={-1} onPress={() => scrollByArrow(-1)} />
      <RailArrow direction={1} onPress={() => scrollByArrow(1)} />
    </div>
  );
}

function RailArrow({ direction, onPress }: { direction: 1 | -1; onPress: () => void }) {
  const side = direction === -1 ? 'left' : 'right';
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={direction === -1 ? 'Scroll the range left' : 'Scroll the range right'}
      className={cn(
        'absolute top-[calc(50%-1.25rem)] z-20 hidden min-h-11 min-w-11 items-center justify-center',
        'rounded-full bg-charcoal text-high-vis-white shadow-[0_10px_30px_rgba(16,24,32,0.35)]',
        'opacity-0 transition-all duration-300 ease-brand hover:bg-warm-red-deep',
        'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-red',
        'group-hover/rail:opacity-100 group-focus-within/rail:opacity-100',
        'lg:flex',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="2">
        {direction === -1 ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
