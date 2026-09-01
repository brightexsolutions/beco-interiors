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
  /** The product's real category, never assumed from the section it is in. */
  category: string;
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
        <div className={`lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] ${GRID_INSET}`}>
          <div className="flex h-full flex-col justify-center pb-14 pr-6 pt-24 lg:py-10 lg:pr-20">
            <div className="flex items-center gap-4">
              <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
              <p
                className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500"
                style={{ animationDelay: '120ms' }}
              >
                Sintered stone, stocked in Nairobi
              </p>
            </div>

            <h1 className="mt-6 max-w-[12ch] font-display text-5xl leading-[1.03] tracking-[-0.015em] text-charcoal sm:text-6xl xl:text-7xl">
              <WordReveal text="Surfaces that outlast the room." />
            </h1>

            <p
              className="beco-enter mt-6 max-w-[42ch] text-base leading-[1.65] text-neutral-700 lg:text-lg"
              style={{ animationDelay: '620ms' }}
            >
              Large format slabs for kitchens, bathrooms, feature walls and flooring. Heat,
              scratch and stain resistant, and here in the showroom today.
            </p>

            <div
              className="beco-enter mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '760ms' }}
            >
              <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
                Request a quote
              </Link>
              <Link href="/shop" className={buttonClasses({ variant: 'outline' })}>
                See the range
              </Link>
            </div>

            {/* --- The slab indicator. Sits on a hairline at the foot of the
                    pinned column, so the type block above never moves as it
                    updates. Announced politely rather than interrupting. --- */}
            <div
              className="beco-enter mt-12 border-t border-neutral-200 pt-5"
              style={{ animationDelay: '900ms' }}
            >
              <div className="flex items-baseline justify-between gap-6">
                <p aria-live="polite" className="flex items-baseline gap-3 font-ui text-sm">
                  {/* Keyed on the active slab so the animation replays as
                      the name changes, like a specimen label turning. */}
                  <span
                    key={current?.slug}
                    className="beco-roll inline-block overflow-hidden font-semibold uppercase tracking-[0.14em] text-charcoal"
                  >
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

              <p className="mt-6 flex items-center gap-3 font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                <span
                  aria-hidden
                  className="beco-scroll-cue inline-block h-6 w-px bg-neutral-300 motion-reduce:animate-none"
                />
                Scroll through the range
              </p>
            </div>
          </div>
        </div>

        {/* --- Desktop: each slab is a specimen card that turns toward the
                reader as it arrives, then settles square. Cards rather than
                bleeding photographs, because a card can carry the stone's
                name and its spec, which is what a specifier is actually
                scrolling to find out. --- */}
        <div className="hidden lg:block lg:py-16 lg:pr-[max(1.5rem,calc((100vw-1380px)/2))] lg:pl-10">
          {slabs.map((slab, i) => (
            <div
              key={slab.slug}
              ref={(el) => { panels.current[i] = el; }}
              // The first card is the LCP element and is deliberately not
              // animated on entry: animating the largest contentful paint is
              // a direct way to delay it. It gets a slow ambient drift
              // instead, which starts well after first paint.
              className={`flex min-h-[92vh] items-center py-6 ${i === 0 ? '' : 'beco-card-flip'}`}
            >
              <SlabCard slab={slab} index={i} total={slabs.length} thickness={thickness} />
            </div>
          ))}
        </div>

        {/* --- Mobile: no pin. A snap sequence, so a four slab and a six slab
                hero occupy the same vertical space. --- */}
        <div className="lg:hidden">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {slabs.map((slab, i) => (
              <li key={slab.slug} className="w-[78vw] shrink-0 snap-center">
                <SlabCard slab={slab} index={i} total={slabs.length} thickness={thickness}
                          priority={i === 0} sizes="78vw" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * A specimen card.
 *
 * The photograph, then a charcoal caption carrying the stone's name, its
 * thickness and its position in the set. That caption is what makes it a card
 * rather than a picture: it names what is being looked at, which a buyer
 * comparing four stones needs and a full bleed photograph cannot give.
 *
 * The whole card is one link, so the target is the card and not a word in it.
 */
function SlabCard({
  slab, index, total, thickness, priority = false, sizes = '(min-width: 1024px) 42vw, 78vw',
}: {
  slab: HeroSlab;
  index: number;
  total: number;
  thickness: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Link href={`/product/${slab.slug}`} className="group block w-full">
      <div className="beco-ambient relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15">
        <Image
          src={slab.src}
          alt={slab.alt}
          fill
          // The first slab is the LCP element, so it is eager and unanimated.
          priority={priority || index === 0}
          sizes={sizes}
          {...blurProps(slab)}
          className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex items-baseline justify-between gap-4 bg-charcoal px-6 py-5 text-high-vis-white">
        <div>
          <p className="font-ui text-sm font-semibold uppercase tracking-[0.16em]">
            {slab.name}
          </p>
          <p className="mt-1 font-ui text-sm text-neutral-500">
            {slab.category}
            <span aria-hidden className="px-2 text-neutral-700">/</span>
            {thickness}
          </p>
        </div>
        <p className="font-ui text-sm font-semibold tabular-nums text-neutral-500">
          {String(index + 1).padStart(2, '0')}
          <span className="text-neutral-700">/{String(total).padStart(2, '0')}</span>
        </p>
      </div>
    </Link>
  );
}
