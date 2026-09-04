'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CountUp } from './count-up';
import { Reveal } from './reveal';
import { cn } from '../lib/cn';

export interface CutoutRevealStat {
  value: number;
  suffix?: string | undefined;
  label: string;
}

export interface CutoutRevealProps {
  eyebrow: string;
  title: string;
  body: string;
  /**
   * One or more photographs, each with its background already removed. Every
   * `next/image` here must be `fill`, not intrinsic width and height: with
   * more than one image the objects crossfade in the SAME box, so the box
   * has to hold its own size rather than take it from whichever image is on
   * screen, or switching photographs would jump the layout.
   */
  images: ReactNode[];
  /** Two or three real facts. Never a number invented to fill the space. */
  stats: CutoutRevealStat[];
  cta?: { label: string; href: string } | undefined;
  /** Puts the object on the right and the copy on the left. */
  reverse?: boolean | undefined;
  intervalMs?: number | undefined;
}

/**
 * A cutout object beside copy that assembles as the section arrives, the
 * object itself drifting slowly for as long as it stays in view, and
 * crossfading to the next real photograph when more than one is given.
 *
 * The photograph carries no frame and no background plate, unlike every
 * other image in the design system. `ProductCard`, `HoverGallery` and the
 * gallery grid all sit a photograph inside a bounded, filled box on purpose,
 * because they are showing a rectangle of the world. This is showing a
 * single object, so a box behind it would put the background back that was
 * just removed. `filter: drop-shadow`, not `box-shadow`, for the same
 * reason: a box shadow draws a rectangle under the image regardless of what
 * is transparent in it, and a drop shadow follows the alpha channel.
 *
 * `beco-cutout-drift` is the continuous motion the object needs while it
 * sits still. `beco-depth-N`, the grid's own parallax, exists to hide a
 * photograph's scaled overscan behind a clipping frame, a problem this
 * component does not have, so it gets its own, simpler class rather than
 * borrowing one built for something else. See the comment beside
 * `beco-cutout-drift` in `motion.css`.
 *
 * Swapping photographs is its own, separate motion: a scale as well as a
 * fade, an incoming object growing into place rather than a flat opacity
 * crossfade, `scale and crop` from the site's own six effect vocabulary
 * rather than a plainer effect invented just for this. It lives on a
 * DIFFERENT element than the drift on purpose. A CSS animation and a CSS
 * transition both reaching for `transform` on the very same element do not
 * blend, the animation's own keyframes simply win outright, which would
 * have made the scale invisible the instant it shared a div with
 * `beco-cutout-drift`. Two nested layers avoid that outright rather than
 * fighting it.
 *
 * A CLIENT component because cycling genuinely needs state, the same reason
 * `RotatingStatement` is one. Opacity and scale both carried by ONE ternary,
 * never also hardcoded into the base class string: that duplication was a
 * real bug in `RotatingStatement`, D67, and this component exists to be the
 * safe version of the same shape from the start.
 *
 * `images.length < 2` skips the interval entirely, so a single photograph
 * behaves exactly as a static one always did, and reduced motion freezes on
 * whichever is first.
 *
 * The copy and its stats use `Reveal`, the same entrance as everywhere else
 * on the site, staggered by 90ms so the eyebrow, the heading, the body and
 * each stat arrive as a sequence rather than as one block.
 */
export function CutoutReveal({
  eyebrow, title, body, images, stats, cta, reverse, intervalMs = 3200,
}: CutoutRevealProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  return (
    <section className="bg-high-vis-white text-charcoal">
      <div className="mx-auto grid max-w-[1380px] items-center gap-16 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className={cn('flex justify-center', reverse ? 'lg:order-2' : undefined)}>
          <div className="relative aspect-square w-full max-w-[22rem]">
            {images.map((img, i) => (
              // Two nested layers, not one, because the crossfade and the
              // continuous drift both need `transform` and a CSS animation
              // beats a CSS transition on the same property of the same
              // element outright, which would have made the scale below
              // invisible, silently overridden by beco-cutout-drift's own
              // keyframes the instant both landed on one div. The crossfade
              // owns this outer layer: opacity AND a scale, an incoming
              // object growing into place rather than a flat fade, `scale
              // and crop` from the site's own six effect vocabulary rather
              // than a seventh invented for this one component. The inner
              // layer owns the drift, filter and object untouched by any of
              // it.
              <div
                key={i}
                aria-hidden={i !== index}
                className={[
                  'absolute inset-0 transition-[opacity,transform] duration-[1000ms] ease-brand',
                  'motion-reduce:transition-none',
                  i === index ? 'opacity-100 scale-100' : 'opacity-0 scale-90',
                ].join(' ')}
                style={{ filter: 'drop-shadow(0 28px 34px rgb(0 0 0 / 0.22))' }}
              >
                <div className="beco-cutout-drift h-full w-full motion-reduce:animate-none">
                  {img}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={reverse ? 'lg:order-1' : undefined}>
          <Reveal>
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-8 bg-warm-red" />
              <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {eyebrow}
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <h2 className="mt-5 max-w-[16ch] font-display text-4xl leading-[1.08] text-charcoal sm:text-5xl">
              {title}
            </h2>
          </Reveal>

          <Reveal delay={180}>
            <p className="mt-5 max-w-[46ch] text-base leading-[1.65] text-neutral-700 lg:text-lg">
              {body}
            </p>
          </Reveal>

          {stats.length > 0 ? (
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-neutral-200 pt-8 sm:grid-cols-3">
              {stats.map((stat, i) => (
                <Reveal key={stat.label} as="div" delay={270 + i * 90}>
                  <dt className="font-ui text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 font-display text-3xl leading-none tracking-[-0.01em] text-charcoal">
                    <CountUp value={stat.value} />
                    {stat.suffix}
                  </dd>
                </Reveal>
              ))}
            </dl>
          ) : null}

          {cta ? (
            <Reveal delay={270 + stats.length * 90}>
              <a
                href={cta.href}
                className="mt-9 inline-block font-ui text-sm font-semibold uppercase tracking-[0.12em] text-warm-red-deep underline-offset-4 hover:underline"
              >
                {cta.label}
              </a>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
