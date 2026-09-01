'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { buttonClasses, WordReveal } from '@beco/ui';
import { blurProps } from '@/lib/products';

/**
 * The pinned split hero, per D30.
 *
 * The type column pins while slabs pass on the right, the counter and spec
 * line tracking whichever is in view, then the pin releases into the page.
 *
 * Built on native `position: sticky`, not a scroll hijacking library. The
 * native scrollbar keeps behaving normally, so a fast flick still reaches the
 * footer, and there is no scroll handler on the main thread to cost INP.
 *
 * The image column bleeds to the viewport edge while the type column stays on
 * the site's 1380px grid. A hero that stops at the container on both sides
 * reads as a page template with a photograph dropped into it, which is
 * exactly what Section 11 says not to build.
 *
 * On mobile the pin is dropped, per D30: type first, then a swipeable
 * sequence. D31 was later revised to keep pinning on mobile, so which of the
 * two wins here is settled on a real device during M4, not by argument. See
 * docs/DECISIONS.md.
 *
 * The first slab is the LCP element. It is never animated on entry, and it is
 * the only image here marked priority.
 */
export interface HeroSlab {
  name: string;
  slug: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  blur?: string | undefined;
}

/** Aligns the type column with the 1380px grid while the image bleeds right. */
const GRID_INSET = 'pl-6 lg:pl-[max(1.5rem,calc((100vw-1380px)/2))]';

export function PinnedHero({ slabs, thickness }: { slabs: HeroSlab[]; thickness: string }) {
  const [active, setActive] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = panels.current.indexOf(entry.target as HTMLDivElement);
          if (index >= 0) setActive(index);
        }
      },
      // Only the panel across the middle band counts, so the counter changes
      // once per slab rather than twice at every boundary.
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const el of panels.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [slabs.length]);

  const current = slabs[active] ?? slabs[0];

  return (
    <section aria-label="Sintered stone" className="relative border-b border-neutral-200">
      <div className="lg:grid lg:grid-cols-2">
        {/* --- Type. Pinned on desktop, static on mobile. --- */}
        <div className={`lg:sticky lg:top-15 lg:h-[calc(100vh-3.75rem)] ${GRID_INSET}`}>
          <div className="flex h-full flex-col py-16 pr-6 lg:justify-center lg:py-20 lg:pr-20">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Sintered stone, stocked in Nairobi
              </p>
            </div>

            <h1 className="mt-7 max-w-[11ch] font-display text-6xl leading-[1.02] tracking-[-0.01em] text-charcoal sm:text-7xl xl:text-[5.5rem]">
              <WordReveal text="Surfaces that outlast the room." />
            </h1>

            <p className="mt-7 max-w-[44ch] text-lg leading-[1.6] text-neutral-700">
              Large format slabs for kitchens, bathrooms, feature walls and flooring. Heat,
              scratch and stain resistant, and here in the showroom today.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
                Request a quote
              </Link>
              <Link href="/shop" className={buttonClasses({ variant: 'ghost' })}>
                See the range
              </Link>
            </div>

            {/* --- The slab indicator. Sits on a hairline at the foot of the
                    pinned column, so the type block above never moves as it
                    updates. Announced politely rather than interrupting. --- */}
            <div className="mt-14 border-t border-neutral-200 pt-5 lg:mt-16">
              <div className="flex items-baseline justify-between gap-6">
                <p aria-live="polite" className="flex items-baseline gap-3 font-ui text-sm">
                  <span className="font-semibold uppercase tracking-[0.14em] text-charcoal">
                    {current?.name}
                  </span>
                  <span className="text-neutral-500">{thickness}</span>
                </p>
                <p className="font-ui text-sm font-semibold tabular-nums text-neutral-500">
                  <span className="text-charcoal">{String(active + 1).padStart(2, '0')}</span>
                  {' / '}
                  {String(slabs.length).padStart(2, '0')}
                </p>
              </div>
              {/* One rule per slab, the current one drawn in. Cheaper to read
                  at a glance than a counter, and it shows how much is left. */}
              <ol className="mt-3 flex gap-1.5" aria-hidden>
                {slabs.map((slab, i) => (
                  <li key={slab.slug} className="h-0.5 flex-1 overflow-hidden bg-neutral-200">
                    <span
                      className="block h-full origin-left bg-charcoal transition-transform duration-500 ease-brand motion-reduce:transition-none"
                      style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
                    />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* --- Desktop: the slabs pass, bleeding to the viewport edge. --- */}
        <div className="hidden lg:block">
          {slabs.map((slab, i) => (
            <div
              key={slab.slug}
              ref={(el) => { panels.current[i] = el; }}
              className="beco-parallax relative h-screen w-full overflow-hidden bg-neutral-100"
            >
              <Image
                src={slab.src}
                alt={slab.alt}
                fill
                // The first slab is the LCP element, so it is eager and
                // unanimated. The rest wait until they are near.
                priority={i === 0}
                sizes="50vw"
                {...blurProps(slab)}
                className="object-cover"
              />
              {/* Names the stone on the photograph itself, so the image is a
                  labelled specimen rather than a decorative panel. A solid
                  chip, not a gradient scrim. */}
              <Link
                href={`/product/${slab.slug}`}
                className="absolute bottom-0 left-0 flex min-h-11 items-center bg-charcoal px-5 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-high-vis-white transition-colors hover:bg-warm-red-deep"
              >
                {slab.name}
              </Link>
            </div>
          ))}
        </div>

        {/* --- Mobile: no pin. A snap sequence, so a four slab and a six slab
                hero occupy the same vertical space. --- */}
        <div className="lg:hidden">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {slabs.map((slab, i) => (
              <li key={slab.slug} className="w-[78vw] shrink-0 snap-center">
                <Link href={`/product/${slab.slug}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                    <Image
                      src={slab.src}
                      alt={slab.alt}
                      fill
                      priority={i === 0}
                      sizes="78vw"
                      {...blurProps(slab)}
                      className="object-cover"
                    />
                  </div>
                  <p className="mt-3 font-ui text-sm font-semibold uppercase tracking-[0.14em] text-charcoal">
                    {slab.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
