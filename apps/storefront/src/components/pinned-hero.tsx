'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClasses, cn, WordReveal } from '@beco/ui';
import { blurProps } from '@/lib/products';

/**
 * The hero, per D79. A full bleed photograph again, not the turning
 * specimen cards D56 built: reported directly from Irene, during an
 * evening session, that the client wants the prototype's full bleed
 * feel back, and the images should sell the experience a stone brings
 * to a finished room rather than read as a material sample.
 *
 * **This reverses D30 and D56, on Brown's explicit instruction after being
 * shown the conflict.** The prototype's own README calls this exact
 * pattern out by name: "Centered text over a darkened full bleed
 * photograph is the pattern the brief explicitly rules out." That
 * reasoning does not stop being true; it is overridden by a specific,
 * informed decision, not forgotten. See D79 in docs/DECISIONS.md.
 *
 * What actually carries over from the prototype: a full bleed photograph,
 * crossfading, with a left heavy dark gradient so the type reads over it.
 * The gradient is deliberately lighter than the prototype's, which ran
 * 0.97 opacity at the left edge: Irene's own note was that it was too
 * dark. This uses the site's real charcoal token rather than the
 * prototype's raw near black, and drops the prototype's gold and red
 * radial glows entirely, since gold is retired per D2 and a second red
 * accent here would spend the page's whole Warm Red budget in the hero
 * alone.
 *
 * What carries over from D30 and D56, married rather than discarded: the
 * real headline, used once, per WordReveal's own rule. The lede
 * crossfading with the active stone, Beco's own first sentence per slab,
 * not written for this hero. Pin dropped entirely on mobile.
 *
 * The name-and-counter indicator that used to sit under the lede was
 * removed on direct feedback: the chip strip on the right already labels
 * the active stone by name (the `beco-chip-label` span next to it), so the
 * indicator was a second, redundant place stating the same thing.
 *
 * What does NOT carry over: the prototype's stock Unsplash photography,
 * its fabricated "520+ products" and five star "Client Rated" stats, and
 * its plain "Elevate Every Surface." headline. Beco's own real photography
 * and real numbers were always the point of this rebuild, and reversing
 * the hero's structure does not reverse that.
 *
 * TECHNIQUE: the crossfading photograph and the pinned type sit in ONE
 * sticky box spanning the section's full width. Which slab is active was
 * originally ALSO driven by scroll position, an IntersectionObserver
 * watching a second, invisible stack of chapters for which one was
 * centred: removed on request, since scrolling the page changing the
 * hero's own photograph read as an unwanted second thing happening at
 * once. The interval below is the only thing that changes `active` now,
 * so the section is close to a normal sticky block rather than one
 * engineered for scroll length, and nothing about it costs INP: no
 * scroll handler, transform and opacity only, matching the site's own
 * motion rules regardless.
 *
 * The first photograph is the LCP element. It is never animated on entry,
 * priority loaded, and the only ambient drift on it starts 1.6s after
 * paint via `.beco-ambient`, the same technique already used for the
 * SlabCard frames and the mobile background this replaces.
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
  /**
   * The stone's own first sentence, from Beco's descriptions document, not
   * written for this hero. Null for a slab with no description yet, Cyprus
   * Grey and a few others: the fallback sentence covers those rather than
   * leaving a blank.
   */
  blurb?: string | null;
}

/** Aligns the type column with the 1380px grid, matching every other
    section on the page, while the photograph itself bleeds edge to edge. */
const GRID_INSET = 'pl-6 lg:pl-[max(1.5rem,calc((100vw-1380px)/2))]';

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

export function PinnedHero({ slabs, thickness }: { slabs: HeroSlab[]; thickness: string }) {
  const [active, setActive] = useState(0);

  // Auto advance, so the range is seen without requiring a scroll, on
  // request: which stone is active USED to also change as the reader
  // scrolled past one of a set of invisible chapters, an
  // IntersectionObserver watching which one was centred. That coupling is
  // removed here rather than layered under this timer: scrolling the page
  // no longer changes the background at all, only this interval does. The
  // same guard RotatingStatement and StoneSlider already use: off under
  // prefers-reduced-motion, and never armed for a single slab.
  useEffect(() => {
    if (slabs.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % slabs.length),
      AUTO_ADVANCE_MS,
    );
    return () => clearInterval(id);
  }, [slabs.length]);

  const lead = slabs[0];

  // Beco's own first sentence per stone, trimmed to one sentence: the site's
  // own copy rule is short copy, and a hero lede is not the place for the
  // three sentence version. A slab with no description falls back to the
  // original generic sentence rather than showing nothing.
  const FALLBACK_LEDE = 'Large format slabs, here in the showroom today.';
  // One short line per stone, not the full first sentence: the hero should
  // not crowd. Take the first sentence, then, if it is still long, its first
  // clause up to a comma, so a stone reads as a phrase under the headline
  // rather than a paragraph.
  const shorten = (text: string) => {
    const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
    if (sentence.length <= 72) return sentence;
    // First clause, trailing punctuation stripped so a single period can be
    // put back cleanly rather than doubling one the sentence already had.
    const clause = (sentence.split(/,\s/)[0]?.trim() ?? sentence).replace(/[\s.,;:]+$/, '');
    return clause.length >= 24 && clause.length <= 88 ? `${clause}.` : sentence;
  };
  const ledes = slabs.map((slab) => (slab.blurb ? shorten(slab.blurb) || FALLBACK_LEDE : FALLBACK_LEDE));
  const longestLede = [...ledes].sort((a, b) => b.length - a.length)[0];

  return (
    <section
      aria-label="Sintered stone"
      className="beco-hero-bleed relative border-b border-neutral-200 bg-charcoal"
    >
      {/* --- The sticky visual: photograph, gradient and type together, one
              box spanning the section's full width.

              top-0 and a full 100vh, not top-20 and 100vh minus the
              header: the photograph itself needs to reach the very top of
              the viewport, behind the header, per beco-hero-bleed above,
              or the header would float over a gap rather than over the
              photograph. Once actually scrolled, the header's own z-50
              simply paints over this box's own top 5rem, the same
              relationship a sticky header has with any page's content,
              rather than this box reserving that space for it. --- */}
      <div className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-[100vh]">
        <div aria-hidden className="beco-ambient absolute inset-0">
          {slabs.map((slab, i) => (
            // The scale-settle lives on this wrapper, the slow ambient drift
            // on the image inside it: a transition and an animation cannot
            // both own `transform` on one element, the bug D67 and D77 both
            // turned on. An incoming photograph settles out of a slight zoom
            // as the last one drifts back, so a change reads as considered
            // rather than as a flat dissolve. The first slide renders at
            // rest, so nothing animates on mount and it is safe as the LCP.
            <div
              key={slab.slug}
              className={cn(
                'absolute inset-0 transition-transform duration-[1800ms] ease-brand',
                'will-change-transform motion-reduce:transition-none motion-reduce:!transform-none',
                i === active ? 'scale-100' : 'scale-[1.06]',
              )}
            >
              <Image
                src={slab.src}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                {...blurProps(slab)}
                // Opacity has exactly ONE source, the ternary: a hardcoded
                // base alongside a conditional one is the exact bug D67 found
                // the first time this crossfade shipped.
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
            GRID_INSET,
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
              Sintered stone, stocked in Nairobi
            </p>
          </div>

          <h1 className="mt-5 max-w-[18ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] text-high-vis-white sm:text-6xl">
            <WordReveal text="Surfaces that outlast the room." />
          </h1>

          <div
            className="beco-enter relative mt-5 max-w-[42ch]"
            style={{ animationDelay: '620ms' }}
          >
            {/* Invisible, in normal flow, sized to the longest of the real
                ledes: what actually reserves this box's height so the
                stacked, absolutely positioned ones below cannot shift the
                buttons and the indicator beneath them as the slab changes. */}
            <p aria-hidden className="invisible text-base leading-[1.65] lg:text-lg">
              {longestLede}
            </p>
            {ledes.map((lede, i) => (
              <p
                // The slab's own slug, not the lede text: more than one
                // slab without its own description shares the identical
                // fallback sentence, which made this a duplicate React key
                // the moment two slabs on the same hero both lacked one.
                key={slabs[i]?.slug ?? i}
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

        {/* --- The rest of the range, on the right where the gradient
                lightens, reported directly as too basic and needing real
                design and motion. Real links to each product, not a
                second orbit. Frame first (beco-pop-in), photograph
                wiping up into it a beat later (beco-chip-wipe), the same
                two stage assembly the gallery already uses reused at
                chip scale rather than invented fresh. Only TRANSFORM and
                OPACITY change on the active state, scale rather than a
                width change, so a stone becoming active never reflows
                its neighbours in the column. Still one section effect,
                the crossfade: everything here is either a one time
                entrance or a quiet accent on a single ring, never a
                second competing choreography. --- */}
        <div className="pointer-events-none absolute inset-y-0 right-6 hidden items-center lg:flex xl:right-14">
          <ul className="pointer-events-auto flex flex-col gap-5">
            {slabs.map((slab, i) => {
              const isActive = i === active;
              return (
                <li key={slab.slug} className="relative">
                  {isActive ? (
                    <span
                      key={`${slab.slug}-label`}
                      aria-hidden
                      className="beco-chip-label absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap bg-charcoal/90 px-3 py-1.5 font-ui text-xs font-semibold uppercase tracking-[0.12em] text-high-vis-white"
                    >
                      {slab.name}
                    </span>
                  ) : null}

                  <Link
                    href={`/product/${slab.slug}`}
                    className={cn(
                      'beco-pop-in group relative block aspect-[4/5] w-16 overflow-hidden bg-neutral-800 transition-transform duration-500 ease-brand sm:w-20',
                      isActive
                        ? 'scale-110'
                        : 'opacity-70 ring-1 ring-inset ring-white/25 hover:scale-105 hover:opacity-100',
                    )}
                    style={{ animationDelay: `${1000 + i * 130}ms` }}
                  >
                    <span className="beco-clip absolute inset-0">
                      <Image
                        src={slab.src}
                        alt=""
                        fill
                        sizes="96px"
                        {...blurProps(slab)}
                        className="beco-chip-wipe object-cover"
                        style={{ animationDelay: `${1150 + i * 130}ms` }}
                      />
                    </span>
                    {isActive ? (
                      <span
                        aria-hidden
                        className="beco-chip-active-ring pointer-events-none absolute inset-0 ring-2 ring-inset ring-high-vis-white"
                      />
                    ) : null}
                    <span className="sr-only">
                      {slab.name}{isActive ? ', showing now' : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* --- Mobile: no pin, since D30 drops it below lg, but the SAME auto
              advancing crossfade as desktop: the background is not static
              any more, it cycles through the range on the timer above,
              which does not depend on scroll chapters that do not exist
              here. The swipeable row below still carries the full set for
              a reader who wants to stop and pick one. --- */}
      <div className="relative min-h-[70svh] overflow-hidden lg:hidden">
        <div aria-hidden className="beco-ambient absolute inset-0">
          {slabs.map((slab, i) => (
            <Image
              key={slab.slug}
              src={slab.src}
              alt=""
              fill
              priority={i === 0}
              sizes="800px"
              {...blurProps(slab)}
              className={cn(
                'object-cover transition-[opacity,transform] duration-[1600ms] ease-brand',
                'will-change-transform motion-reduce:transition-none motion-reduce:!transform-none',
                i === active ? 'opacity-50 scale-100' : 'opacity-0 scale-[1.06]',
              )}
            />
          ))}
          <div aria-hidden className="absolute inset-0" style={{ backgroundImage: GRADIENT }} />
        </div>

      <div className={cn(GRID_INSET, 'beco-hero-content-top relative flex h-full flex-col justify-end pb-10 pr-6')}>
        <div className="flex items-center gap-4">
          <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
          <p className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300" style={{ animationDelay: '120ms' }}>
            Sintered stone, stocked in Nairobi
          </p>
        </div>
        <h2 className="mt-5 max-w-[18ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] text-high-vis-white sm:text-6xl">
          Surfaces that outlast the room.
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

      {/* --- Mobile: a swipeable sequence, so a four slab and a six slab
              hero occupy the same vertical space. --- */}
      <div className="lg:hidden">
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-16 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slabs.map((slab, i) => (
            <li key={slab.slug} className="w-[78vw] shrink-0 snap-center">
              {/* `800px` rather than `78vw`, deliberately: it is the same
                  derivative the opening screen's background already asked
                  for, so the first card costs a cache hit instead of a
                  second download. No `priority` here, the background is the
                  mobile LCP and it is the same photograph. */}
              <SlabCard slab={slab} index={i} total={slabs.length} thickness={thickness}
                        sizes="800px" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A specimen card, mobile only now: the desktop turning cards D56 built
 * are gone with the orbit, replaced by the full bleed crossfade above.
 *
 * The photograph, then a charcoal caption carrying the stone's name, its
 * thickness and its position in the set. That caption is what makes it a
 * card rather than a picture: it names what is being looked at, which a
 * buyer comparing four stones needs and a full bleed photograph cannot
 * give.
 *
 * The whole card is one link, so the target is the card and not a word in it.
 */
function SlabCard({
  slab, index, total, thickness, priority = false,
  sizes = '78vw',
}: {
  slab: HeroSlab;
  index: number;
  total: number;
  thickness: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Link
      href={`/product/${slab.slug}`}
      className={cn(
        'group beco-lean block w-full [transform-style:preserve-3d]',
        'motion-reduce:!transform-none motion-reduce:transition-none',
      )}
    >
      <div className="beco-ambient beco-sheen relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 shadow-[0_24px_64px_rgba(16,24,32,0.18)] after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15">
        <Image
          src={slab.src}
          alt={slab.alt}
          fill
          // Stated by the caller, never inferred from the index. Inferring it
          // meant the mobile row's first card also claimed priority, which
          // preloaded a second copy of the photograph already behind the hero.
          priority={priority}
          sizes={sizes}
          {...blurProps(slab)}
          className="object-cover transition-transform duration-[900ms] ease-brand group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="beco-plate flex items-baseline justify-between gap-4 bg-charcoal px-6 py-5 text-high-vis-white">
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
