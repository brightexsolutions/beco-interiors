'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClasses, cn, WordReveal } from '@beco/ui';
import { blurProps } from '@/lib/products';
import { HERO_GRID_INSET } from '@/lib/layout';
import { RotatingRoomWord } from './rotating-room-word';

/**
 * The hero, per D79, broadened from sintered stone alone to all six ranges
 * per D92. A full bleed photograph, crossfading, with a left heavy dark
 * gradient so the type reads over it, the same technique D79 built. What
 * changed under D92: the hero now walks through every range Beco sells
 * rather than repeating stone four times, on Brown's own verdict that a
 * hero saying only "sintered stone" undersold a six range supplier before a
 * reader reached the "What we deal in" section further down the page.
 *
 * The photography backing each slide is a static manifest, `HERO_RANGE_IMAGES`
 * in `@/lib/ranges`, not a live query against `products`: see that file's
 * own note and D92 for why a hero cannot depend on data `pnpm db:reset`
 * empties out.
 *
 * TECHNIQUE: the crossfading photograph and the pinned type sit in ONE
 * sticky box spanning the section's full width. Which range is active is
 * driven by an interval alone, no scroll coupling, the same reasoning D79
 * already recorded: scrolling the page changing the hero's own photograph
 * read as an unwanted second thing happening at once.
 *
 * The first photograph is the LCP element. It is never animated on entry,
 * priority loaded, and the only ambient drift on it starts 1.6s after
 * paint via `.beco-ambient`, the same technique already used for the
 * SlabCard frames and the mobile background this replaces.
 */
export interface HeroRangeSlide {
  /** The range's own title, "Lighting", "Wall panels", never a single
   *  product's name: this hero sells the range, not one item in it. */
  title: string;
  slug: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  blur?: string | undefined;
  /**
   * The chip rail's own image, distinct from the big background only where
   * a caller wants variety. Falls back to `src` so a chip is never blank.
   */
  thumbSrc?: string;
  thumbBlur?: string | undefined;
  /** The range's own one line description, from `RANGE_GROUPS`. */
  body: string;
  /** `/shop/<slug>` when the range has real stock behind it, null when it
   *  does not yet: a chip or card never links to a dead page, matching the
   *  same `hasStock` rule the "What we deal in" grid already enforces. */
  href: string | null;
}

/** #101820, the real charcoal token, not the prototype's raw near-black.
    Left heavy so the type reads, lighter than the prototype's 0.97 peak,
    per Irene's own note that it ran too dark. No gold, no red glow: D2
    retired the prototype's palette, only its structure carries forward. */
const GRADIENT =
  'linear-gradient(90deg, rgba(16,24,32,0.80) 0%, rgba(16,24,32,0.52) 40%, ' +
  'rgba(16,24,32,0.20) 72%, rgba(16,24,32,0.38) 100%), ' +
  'linear-gradient(180deg, rgba(16,24,32,0.12) 0%, transparent 32%, rgba(16,24,32,0.42) 100%)';

/** ms between automatic slides, the prototype's own cadence. */
const AUTO_ADVANCE_MS = 4200;

export function PinnedHero({ slides }: { slides: HeroRangeSlide[] }) {
  const [active, setActive] = useState(0);

  // Auto advance, so the range is seen without requiring a scroll. Off
  // under prefers-reduced-motion, and never armed for a single slide.
  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      AUTO_ADVANCE_MS,
    );
    return () => clearInterval(id);
  }, [slides.length]);

  // One short line per range, not the full body sentence: the hero should
  // not crowd. Take the first sentence, then, if it is still long, its
  // first clause up to a comma, so a range reads as a phrase under the
  // headline rather than a paragraph. Same heuristic D79 built for the
  // stone-only hero, reused rather than rewritten: the bug it guards
  // against (a first clause under 24 characters falling through
  // untouched) is exactly as possible with range copy as with stone copy.
  const shorten = (text: string) => {
    const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
    if (sentence.length <= 72) return sentence;
    const clause = (sentence.split(/,\s/)[0]?.trim() ?? sentence).replace(/[\s.,;:]+$/, '');
    if (clause.length >= 24 && clause.length <= 88) return `${clause}.`;
    const cut = sentence.slice(0, 72);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 24 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '');
  };
  const ledes = slides.map((slide) => shorten(slide.body));
  const longestLede = [...ledes].sort((a, b) => b.length - a.length)[0];

  return (
    <section
      aria-label="What Beco stocks"
      className="beco-hero-bleed relative border-b border-neutral-200 bg-charcoal"
    >
      {/* --- The sticky visual: photograph, gradient and type together, one
              box spanning the section's full width. --- */}
      <div className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-[100vh]">
        <div aria-hidden className="beco-ambient absolute inset-0">
          {slides.map((slide, i) => (
            <div
              key={slide.slug}
              className={cn(
                'absolute inset-0 transition-transform duration-[1800ms] ease-brand',
                'will-change-transform motion-reduce:transition-none motion-reduce:!transform-none',
                i === active ? 'scale-100' : 'scale-[1.06]',
              )}
            >
              <Image
                src={slide.src}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                {...blurProps(slide)}
                className={cn(
                  'object-cover transition-opacity duration-[1400ms] ease-brand motion-reduce:transition-none',
                  i === active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>
          ))}
        </div>

        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: GRADIENT }} />

        <div
          className={cn(
            HERO_GRID_INSET,
            'beco-hero-content-top relative flex h-full max-w-[52rem] flex-col justify-end pb-10 pr-6 pt-16',
            'lg:justify-center lg:pb-14 lg:pr-20',
          )}
        >
          <div className="flex items-center gap-4">
            <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
            <p
              className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300"
              style={{ animationDelay: '120ms' }}
            >
              Six ranges, stocked in Nairobi
            </p>
          </div>

          <h1 className="mt-5 max-w-[18ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] text-high-vis-white">
            <WordReveal text="Every material for the" /> <RotatingRoomWord />
          </h1>

          <div
            className="beco-enter relative mt-5 max-w-[42ch]"
            style={{ animationDelay: '620ms' }}
          >
            <p aria-hidden className="invisible text-base leading-[1.65] lg:text-lg">
              {longestLede}
            </p>
            {ledes.map((lede, i) => (
              <p
                key={slides[i]?.slug ?? i}
                aria-hidden={i !== active}
                className={cn(
                  'absolute inset-0 text-base leading-[1.65] text-neutral-300 lg:text-lg',
                  'transition-opacity duration-[700ms] ease-brand motion-reduce:transition-none',
                  i === active ? 'opacity-100' : 'opacity-0',
                )}
              >
                {lede}
              </p>
            ))}
            <p aria-live="polite" className="sr-only">
              {ledes[active]}
            </p>
          </div>

          <div
            className="beco-enter mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '760ms' }}
          >
            <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
              Request a quote
            </Link>
            <Link
              href="/shop"
              className={cn(
                buttonClasses({ variant: 'outline' }),
                'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
              )}
            >
              See the range
            </Link>
          </div>
        </div>

        {/* --- The rest of the ranges, on the right where the gradient
                lightens. Round material samples, the way an actual stone
                chip is handed across a counter, lifted off the photo with a
                real shadow rather than a hairline ring, loosely staggered
                side to side. A range with no stock yet renders as a plain
                span rather than a Link: a chip pointing at an empty shop
                page is a decorative control, the exact thing rule 3 rules
                out. --- */}
        <div className="pointer-events-none absolute inset-y-0 right-12 hidden items-center lg:flex">
          <ul className="pointer-events-auto flex flex-col gap-6">
            {slides.map((slide, i) => {
              const isActive = i === active;
              const chipClassName = cn(
                'beco-pop-in group relative block aspect-square w-14 overflow-hidden rounded-full bg-neutral-800',
                'shadow-[0_10px_28px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-brand sm:w-16',
                isActive
                  ? 'scale-110'
                  : 'opacity-80 ring-1 ring-inset ring-white/30 hover:scale-105 hover:opacity-100',
              );
              const chipStyle = { animationDelay: `${1000 + i * 130}ms` };
              const chipContent = (
                <>
                  <span className="beco-clip absolute inset-0 rounded-full">
                    <Image
                      src={slide.thumbSrc ?? slide.src}
                      alt=""
                      fill
                      sizes="64px"
                      {...blurProps({ blur: slide.thumbBlur ?? slide.blur })}
                      className="beco-chip-wipe object-cover"
                      style={{ animationDelay: `${1150 + i * 130}ms` }}
                    />
                  </span>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="beco-chip-active-ring pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-high-vis-white"
                    />
                  ) : null}
                  <span className="sr-only">
                    {slide.title}{isActive ? ', showing now' : ''}
                  </span>
                </>
              );
              return (
                <li
                  key={slide.slug}
                  className="relative"
                  style={{ marginInlineStart: `${(i % 2) * 14}px` }}
                >
                  {isActive ? (
                    <span
                      key={`${slide.slug}-label`}
                      aria-hidden
                      className="beco-chip-label absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap bg-charcoal/90 px-3 py-1.5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-high-vis-white"
                    >
                      {slide.title}
                    </span>
                  ) : null}

                  {slide.href ? (
                    <Link href={slide.href} className={chipClassName} style={chipStyle}>
                      {chipContent}
                    </Link>
                  ) : (
                    <span className={chipClassName} style={chipStyle}>
                      {chipContent}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* --- Mobile: no pin, since D30 drops it below lg, but the SAME auto
              advancing crossfade as desktop. --- */}
      <div className="relative min-h-[70svh] overflow-hidden lg:hidden">
        <div aria-hidden className="beco-ambient absolute inset-0">
          {slides.map((slide, i) => (
            <Image
              key={slide.slug}
              src={slide.src}
              alt=""
              fill
              priority={i === 0}
              sizes="800px"
              {...blurProps(slide)}
              className={cn(
                'object-cover transition-[opacity,transform] duration-[1600ms] ease-brand',
                'will-change-transform motion-reduce:transition-none motion-reduce:!transform-none',
                i === active ? 'opacity-50 scale-100' : 'opacity-0 scale-[1.06]',
              )}
            />
          ))}
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: GRADIENT }} />
        </div>

      <div className={cn(HERO_GRID_INSET, 'beco-hero-content-top relative flex h-full flex-col justify-end pb-10 pr-6')}>
        <div className="flex items-center gap-4">
          <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
          <p className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300" style={{ animationDelay: '120ms' }}>
            Six ranges, stocked in Nairobi
          </p>
        </div>
        <h2 className="mt-5 max-w-[18ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] text-high-vis-white">
          Every material for the <RotatingRoomWord />
        </h2>
        <p className="beco-enter mt-5 max-w-[38ch] text-base leading-[1.6] text-neutral-300" style={{ animationDelay: '620ms' }}>
          {ledes[0]}
        </p>
        <div className="beco-enter mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '760ms' }}>
          <Link href="/quote" className={buttonClasses({ variant: 'primary' })}>
            Request a quote
          </Link>
          <Link
            href="/shop"
            className={cn(
              buttonClasses({ variant: 'outline' }),
              'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
            )}
          >
            See the range
          </Link>
        </div>
      </div>
      </div>

      {/* --- Mobile: a swipeable sequence, so a four slide and a six slide
              hero occupy the same vertical space. --- */}
      <div className="lg:hidden">
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-16 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slides.map((slide, i) => (
            <li key={slide.slug} className="w-[78vw] shrink-0 snap-center">
              <RangeCard slide={slide} index={i} total={slides.length} sizes="800px" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A specimen card, mobile only: the desktop turning cards D56 built are
 * gone with the orbit, replaced by the full bleed crossfade above.
 *
 * The photograph, then a charcoal caption carrying the range's name and its
 * position in the set. No thickness or category line any more, per D92: a
 * single hero now spans stone, lighting, hardware and more, and those two
 * facts stopped being something every range shares.
 *
 * A range with no stock yet renders without a `Link` wrapper entirely,
 * matching the desktop chip rail's own rule: a card is either a real
 * destination or it is not a control.
 */
function RangeCard({
  slide, index, total, priority = false, sizes = '78vw',
}: {
  slide: HeroRangeSlide;
  index: number;
  total: number;
  priority?: boolean;
  sizes?: string;
}) {
  const photo = (
    <div className="beco-ambient beco-sheen relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 shadow-[0_24px_64px_rgba(16,24,32,0.18)] after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15">
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        priority={priority}
        sizes={sizes}
        {...blurProps(slide)}
        className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </div>
  );

  const caption = (
    <div className="beco-plate flex items-baseline justify-between gap-4 bg-charcoal px-6 py-5 text-high-vis-white">
      <p className="font-ui text-sm font-semibold uppercase tracking-[0.16em]">
        {slide.title}
      </p>
      <p className="font-ui text-sm font-semibold tabular-nums text-neutral-500">
        {String(index + 1).padStart(2, '0')}
        <span className="text-neutral-700">/{String(total).padStart(2, '0')}</span>
      </p>
    </div>
  );

  if (!slide.href) {
    return (
      <div className="block w-full">
        {photo}
        {caption}
      </div>
    );
  }

  return (
    <Link
      href={slide.href}
      className={cn(
        'group beco-lean block w-full [transform-style:preserve-3d]',
        'motion-reduce:!transform-none motion-reduce:transition-none',
      )}
    >
      {photo}
      {caption}
    </Link>
  );
}
