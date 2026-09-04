import type { ReactNode } from 'react';
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
   * A photograph with its background already removed, alpha edges and all.
   * Not `fill`: the object sets its own aspect ratio and the drift below
   * moves it inside that box, so a caller passes ordinary intrinsic width
   * and height, the same as any other image outside a cropped frame.
   */
  image: ReactNode;
  /** Two or three real facts. Never a number invented to fill the space. */
  stats: CutoutRevealStat[];
  cta?: { label: string; href: string } | undefined;
  /** Puts the object on the right and the copy on the left. */
  reverse?: boolean | undefined;
}

/**
 * A cutout object beside copy that assembles as the section arrives, the
 * object itself drifting slowly for as long as the section is in view.
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
 * `beco-cutout-drift` is the only motion the object needs. `beco-depth-N`,
 * the grid's own parallax, exists to hide a photograph's scaled overscan
 * behind a clipping frame, a problem this component does not have, so it
 * gets its own, simpler class rather than borrowing one built for something
 * else. See the comment beside `beco-cutout-drift` in `motion.css`.
 *
 * The copy and its stats use `Reveal`, the same entrance as everywhere else
 * on the site, staggered by 90ms so the eyebrow, the heading, the body and
 * each stat arrive as a sequence rather than as one block.
 */
export function CutoutReveal({ eyebrow, title, body, image, stats, cta, reverse }: CutoutRevealProps) {
  return (
    <section className="bg-high-vis-white text-charcoal">
      <div className="mx-auto grid max-w-[1380px] items-center gap-16 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className={cn('flex justify-center', reverse ? 'lg:order-2' : undefined)}>
          <div className="w-full max-w-[22rem]">
            <div
              aria-hidden={false}
              className="beco-cutout-drift motion-reduce:animate-none"
              style={{ filter: 'drop-shadow(0 28px 34px rgb(0 0 0 / 0.22))' }}
            >
              {image}
            </div>
            {/* The object's own ground line, not a shadow ellipse: a hairline
                is the site's own motif for "this is where something ends",
                already used under every eyebrow, so the object reads as
                resting on the page rather than floating with nothing under
                it, without drawing a new shape the rest of the site does not
                use. */}
            <span aria-hidden className="mx-auto mt-6 block h-px w-20 bg-charcoal/15" />
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
