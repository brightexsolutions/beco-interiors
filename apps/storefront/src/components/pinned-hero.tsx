'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { buttonClasses, cn, WordReveal } from '@beco/ui';
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
 * MOBILE IS NOT THE DESKTOP HERO REFLOWED, changed 3 September after looking at
 * a real phone. The opening screen was white with black type on it and nothing
 * else: every slab sat below the fold, so the first thing a visitor saw of a
 * materials company was a paragraph.
 *
 * Below lg the stone itself is the background. The first slab fills the
 * opening screen behind a charcoal ground, the type sits over it in white and
 * settles to the bottom of the frame, and the swipeable row of specimen cards
 * follows underneath on white. Same construction as the openings on /contact
 * and /shop, so the three read as one site.
 *
 * It is the SAME photograph as the first card in the row, and the row asks for
 * the same 800px derivative, so mobile downloads it once and the card is a
 * cache hit.
 *
 * The honest cost, since both treatments are in the DOM and only CSS hides
 * one: each breakpoint preloads one image it will not use. Mobile pays about
 * 40KB for the desktop card's 400px derivative, desktop pays about 150KB for
 * this 800px background. Rendering one or the other would need a breakpoint
 * decision on the server, which cannot be made from a request. Worth measuring
 * when Lighthouse finally runs, against the 1.0MB home page budget.
 *
 * Two things were removed rather than restyled. The top padding was 96px,
 * which is desktop breathing room on a 390px screen. And the slab indicator
 * was rendered on mobile where it can NEVER work: it tracks the desktop panel
 * column, which is `display: none` below lg, and a hidden element never
 * intersects, so it sat permanently on 01 naming the first slab whichever card
 * you had swiped to. An indicator that advertises tracking and does not track
 * is a decorative control under rule 3. It is desktop only now, and the mobile
 * cards already carry their own position on their plates.
 *
 * The first slab is the LCP element. It is never animated on entry, and it is
 * the only image here marked priority.
 *
 * THE LEDE CROSSFADES WITH THE ACTIVE SLAB, added 4 September. It used to be
 * one fixed sentence for the whole scroll, so the type column stayed static
 * while photographs turned beside it, which reads as two unrelated things
 * sharing a screen rather than one hero responding to itself.
 *
 * The H1 does NOT change. `WordReveal`'s own rule is that it is used once,
 * on this headline, nowhere else, and that holds regardless of what the copy
 * beside it does: "Surfaces that outlast the room." is the sentence the hero
 * opens on and the one it keeps, so the site still has one fixed thing to
 * say when everything else around it is moving.
 *
 * The lede is Beco's own first sentence for that stone, not written for this
 * hero, the same real-copy discipline `blurb` states on `HeroSlab`. A slab
 * with no description falls back to the original generic sentence rather
 * than showing nothing.
 *
 * Every lede is rendered at once, absolutely stacked, and only the active
 * one is opacity 100: the SAME technique `RotatingStatement` uses, and the
 * same lesson from fixing it applies here. Opacity has exactly one source,
 * the ternary. A hardcoded base opacity alongside a conditional one is
 * EXACTLY the bug that froze that component's photograph while its word kept
 * cycling: two classes for the same property, Tailwind's stylesheet order
 * decides the winner once for everyone, and the index stops mattering.
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
  /** The mobile background, and the first card in the row: one fetch, used twice. */
  const lead = slabs[0];

  // Beco's own first sentence per stone, trimmed to one sentence: the site's
  // own copy rule is short copy, and a hero lede is not the place for the
  // three sentence version. A slab with no description falls back to the
  // original generic sentence rather than showing nothing.
  const FALLBACK_LEDE =
    'Large format slabs for kitchens, bathrooms, feature walls and flooring. Heat, scratch and stain resistant, and here in the showroom today.';
  const ledes = slabs.map((slab) => {
    if (!slab.blurb) return FALLBACK_LEDE;
    const firstSentence = slab.blurb.split(/(?<=[.!?])\s/)[0];
    return firstSentence || FALLBACK_LEDE;
  });
  const longestLede = [...ledes].sort((a, b) => b.length - a.length)[0];

  return (
    <section aria-label="Sintered stone" className="relative border-b border-neutral-200">
      <div className="lg:grid lg:grid-cols-2">
        {/* --- Type. Pinned on desktop. On mobile it sits over the stone. --- */}
        <div
          className={cn(
            'relative min-h-[70svh] bg-charcoal',
            'lg:min-h-0 lg:bg-transparent lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)]',
            GRID_INSET,
          )}
        >
          {/* Mobile only. `svh` rather than `vh`, so the opening screen does
              not jump by the height of the address bar on first scroll. */}
          {lead ? (
            <div aria-hidden className="beco-ambient absolute inset-0 overflow-hidden lg:hidden">
              <Image
                src={lead.src}
                alt=""
                fill
                priority
                // Pinned to the 800px derivative rather than left to pick the
                // 1600px one at 3x. This sits behind type at 40%, where extra
                // detail buys nothing and would put the hero over its 150KB
                // budget on a Nairobi mobile connection.
                sizes="800px"
                {...blurProps(lead)}
                className="object-cover opacity-40"
              />
            </div>
          ) : null}

          <div className="relative flex h-full flex-col justify-end pb-10 pr-6 pt-16 lg:justify-center lg:py-10 lg:pb-14 lg:pr-20">
            <div className="flex items-center gap-4">
              <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
              <p
                className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300 lg:text-neutral-500"
                style={{ animationDelay: '120ms' }}
              >
                Sintered stone, stocked in Nairobi
              </p>
            </div>

            <h1 className="mt-6 max-w-[12ch] font-display text-5xl leading-[1.03] tracking-[-0.015em] text-high-vis-white sm:text-6xl lg:text-charcoal xl:text-7xl">
              <WordReveal text="Surfaces that outlast the room." />
            </h1>

            <div
              className="beco-enter relative mt-6 max-w-[42ch]"
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
                  key={lede}
                  aria-hidden={i !== active}
                  className={[
                    'absolute inset-0 text-base leading-[1.65] text-neutral-300 lg:text-lg lg:text-neutral-700',
                    'transition-opacity duration-[700ms] ease-brand motion-reduce:transition-none',
                    i === active ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
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
                  // Charcoal on charcoal is invisible, so it inverts over the
                  // stone and returns to the standard outline on desktop.
                  'border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal',
                  'lg:border-charcoal lg:text-charcoal lg:hover:bg-charcoal lg:hover:text-high-vis-white',
                )}
              >
                See the range
              </Link>
            </div>

            {/* --- The slab indicator. Sits on a hairline at the foot of the
                    pinned column, so the type block above never moves as it
                    updates. Announced politely rather than interrupting. --- */}
            <div
              className="beco-enter mt-12 hidden border-t border-neutral-200 pt-5 lg:block"
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
        <div className="beco-orbit-stage hidden lg:block lg:py-16 lg:pr-[max(1.5rem,calc((100vw-1380px)/2))] lg:pl-10">
          {slabs.map((slab, i) => (
            <div
              key={slab.slug}
              ref={(el) => { panels.current[i] = el; }}
              // The orbit is scroll POSITION, not an entry animation, so the
              // LCP rule is satisfied by geometry rather than by an
              // exception: this panel sits centred in the viewport at scroll
              // zero, which is the middle of its own range, so the first slab
              // paints square on and fully opaque. Nothing about it waits.
              className="beco-orbit flex min-h-[78vh] items-center py-6"
            >
              <SlabCard slab={slab} index={i} total={slabs.length} thickness={thickness}
                        priority={i === 0} lean={false} />
            </div>
          ))}
        </div>

        {/* --- Mobile: no pin. A snap sequence, so a four slab and a six slab
                hero occupy the same vertical space. --- */}
        <div className="lg:hidden">
          <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-16 pt-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  slab, index, total, thickness, priority = false, lean = true,
  sizes = '(min-width: 1024px) 42vw, 78vw',
}: {
  slab: HeroSlab;
  index: number;
  total: number;
  thickness: string;
  priority?: boolean;
  /**
   * The static propped lean. Off in the desktop column, where the orbit owns
   * the third dimension: two 3D transforms on nested elements do not read as
   * one object, they read as a card wobbling inside a frame.
   */
  lean?: boolean;
  sizes?: string;
}) {
  return (
    // The lean lives on the link, so the whole card including its plate
    // turns as one object rather than the photograph tilting inside a
    // stationary frame.
    <Link
      href={`/product/${slab.slug}`}
      className={cn(
        'group block w-full [transform-style:preserve-3d]',
        'motion-reduce:!transform-none motion-reduce:transition-none',
        lean && 'beco-lean',
      )}
    >
      {/* Height is driven by the space available, not by the card's own
          ratio, so the photograph and its plate are on screen together. A 3:4
          frame in this column came out taller than the viewport on its own. */}
      <div className="beco-ambient beco-sheen relative aspect-[3/4] w-full overflow-hidden bg-neutral-100 shadow-[0_24px_64px_rgba(16,24,32,0.18)] after:pointer-events-none after:absolute after:inset-0 after:ring-1 after:ring-inset after:ring-charcoal/15 lg:aspect-auto lg:h-[min(58vh,32rem)]">
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
