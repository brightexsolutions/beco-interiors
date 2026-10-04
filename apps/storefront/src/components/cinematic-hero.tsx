'use client';

import Link from 'next/link';
import { getImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import { buttonClasses, cn, WordReveal } from '@beco/ui';
import { HERO_GRID_INSET, HERO_GRID_INSET_RIGHT } from '@/lib/layout';
import type { HeroRoom } from '@/lib/hero-rooms';

/**
 * The home hero, D120. Our own finished rooms, full screen, one after
 * another: a kitchen, a bathroom, a living room, a reception, a bar. Each
 * photograph pushes in slowly while it is on screen and crossfades to the
 * next, and a caption names the room and the material we supplied in it.
 * One line of type, two actions, nothing else competing with the room.
 *
 * Motion, inside the D31 rules: transform and opacity only, the first
 * photograph (the LCP element) holds still for 1.6s before its push starts,
 * no pinning and no scroll coupling. Under prefers-reduced-motion nothing
 * advances on its own and nothing moves; the reader steps through with the
 * room buttons, or presses Play.
 *
 * Only the room on screen and the one after it are rendered as images, so
 * the first paint fetches two photographs, not five. Each is a `<picture>`
 * with a 16:9 frame for desktop and a 3:4 frame for phones, cut from the
 * same source, so neither screen crops a photo blind.
 */
export interface CinematicRoom extends HeroRoom {
  /** The range page for the material, or null while that range has no stock. */
  href: string | null;
}

/** How long each room stays on screen. */
export const SLIDE_MS = 6500;

const SCRIM =
  'linear-gradient(180deg, rgba(16,24,32,0.50) 0%, rgba(16,24,32,0) 20%, rgba(16,24,32,0) 42%, rgba(16,24,32,0.88) 100%), ' +
  'linear-gradient(90deg, rgba(16,24,32,0.55) 0%, rgba(16,24,32,0) 58%)';

/** Phones stack the type higher up the frame, so the dark starts sooner. */
const SCRIM_PHONE =
  'linear-gradient(180deg, rgba(16,24,32,0.50) 0%, rgba(16,24,32,0) 18%, rgba(16,24,32,0.10) 32%, rgba(16,24,32,0.78) 52%, rgba(16,24,32,0.92) 100%)';

function RoomPicture({ room, priority }: { room: CinematicRoom; priority: boolean }) {
  const common = { alt: room.alt, sizes: '100vw', priority };
  const {
    props: { srcSet: wideSrcSet },
  } = getImageProps({ ...common, src: room.wide.path, width: room.wide.width, height: room.wide.height });
  const { props: tall } = getImageProps({ ...common, src: room.tall.path, width: room.tall.width, height: room.tall.height });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={wideSrcSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...tall} className="h-full w-full object-cover" />
    </picture>
  );
}

export function CinematicHero({ rooms }: { rooms: readonly CinematicRoom[] }) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [started, setStarted] = useState(false);
  // Rooms that have been on screen stay mounted, so stepping back is instant.
  const [shown, setShown] = useState<Set<number>>(() => new Set([0]));

  const count = rooms.length;
  const next = (active + 1) % count;

  const go = (index: number) => {
    if (index === active) return;
    setPrevious(active);
    setActive(index);
    setStarted(true);
    setShown((s) => (s.has(index) ? s : new Set(s).add(index)));
  };

  // Reduced motion: nothing advances unless the reader asks it to.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  // A hidden tab does not burn through the rooms unseen.
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!playing || hidden || count < 2) return;
    const id = window.setTimeout(() => go(next), SLIDE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playing, hidden, count]);

  const room = rooms[active]!;
  const autoplay = playing && !hidden && count > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Rooms we have finished"
      className="beco-hero-bleed relative h-[100svh] min-h-[36rem] overflow-hidden bg-charcoal text-high-vis-white"
    >
      {/* --- The rooms. --- */}
      <div className="absolute inset-0">
        {rooms.map((r, i) => {
          const isActive = i === active;
          const mounted = shown.has(i) || i === next;
          if (!mounted) return null;
          return (
            <div
              key={r.slug}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}, ${r.room}`}
              aria-hidden={!isActive}
              className={cn(
                'absolute inset-0 transition-opacity duration-[1600ms] ease-brand motion-reduce:transition-none',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div
                data-first={i === 0 && !started ? '' : undefined}
                className={cn('h-full w-full will-change-transform', (isActive || i === previous) && 'beco-hero-push')}
              >
                <RoomPicture room={r} priority={i === 0} />
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block" style={{ backgroundImage: SCRIM }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden" style={{ backgroundImage: SCRIM_PHONE }} />

      {/* --- The words, the actions, the caption and the controls. --- */}
      <div className={cn(HERO_GRID_INSET, HERO_GRID_INSET_RIGHT, 'absolute inset-x-0 bottom-0 z-10 pb-24 sm:pb-24 lg:pb-10')}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
          <div>
            <div className="flex items-center gap-4">
              <span aria-hidden className="beco-rule-draw h-px w-8 bg-warm-red" />
              <p className="beco-enter font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300" style={{ animationDelay: '120ms' }}>
                Beco Interiors, Nairobi
              </p>
            </div>
            <h1 className="mt-5 max-w-[14ch] font-display text-5xl leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
              <WordReveal text="The room starts with the surface." delay={200} />
            </h1>
            <div className="beco-enter mt-8 flex gap-3 sm:flex-wrap" style={{ animationDelay: '820ms' }}>
              <Link href="/shop" className={cn(buttonClasses({ variant: 'primary' }), 'flex-1 sm:flex-none')}>
                View products
              </Link>
              <Link
                href="/contact"
                className={cn(
                  buttonClasses({ variant: 'outline' }),
                  'flex-1 border-high-vis-white text-high-vis-white hover:bg-high-vis-white hover:text-charcoal sm:flex-none',
                )}
              >
                Plan a visit
              </Link>
            </div>
          </div>

          {/* The caption names the room on screen and what we supplied in it. */}
          <div key={room.slug} className="beco-enter hidden lg:block" aria-live={autoplay ? 'off' : 'polite'}>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">{room.room}</p>
            <p className="mt-2 font-display text-3xl leading-[1.1]">{room.material}</p>
            {room.href ? (
              <Link
                href={room.href}
                className="mt-3 inline-flex min-h-11 items-center font-ui text-sm font-semibold uppercase tracking-[0.12em] text-high-vis-white underline-offset-8 hover:underline"
              >
                See the range
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-8 lg:mt-10">
          {/* Phone caption: one line above the controls. */}
          <p className="pt-2 font-ui text-base text-neutral-200 lg:hidden" aria-live={autoplay ? 'off' : 'polite'}>
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">{room.room}</span>
            {room.href ? (
              <Link href={room.href} className="underline-offset-4 hover:underline">{room.material}</Link>
            ) : (
              room.material
            )}
          </p>

          <div className="flex items-center gap-3">
            <ol className="flex flex-1 gap-2">
              {rooms.map((r, i) => {
                const isActive = i === active;
                return (
                  <li key={r.slug} className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Show the ${r.room.toLowerCase()}`}
                      aria-current={isActive ? 'true' : undefined}
                      className="group flex h-11 w-full flex-col justify-center gap-2 text-left"
                    >
                      <span className="relative block h-0.5 w-full overflow-hidden bg-high-vis-white/25">
                        <span
                          key={isActive && autoplay ? `${active}-run` : `${i}-still`}
                          aria-hidden
                          className={cn(
                            'absolute inset-0 origin-left bg-high-vis-white',
                            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-hover:bg-high-vis-white/50',
                            isActive && autoplay && 'beco-hero-progress',
                          )}
                          style={isActive && autoplay ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                        />
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'hidden truncate font-ui text-xs font-semibold uppercase tracking-[0.14em] transition-colors lg:block',
                          isActive ? 'text-high-vis-white' : 'text-neutral-400 group-hover:text-neutral-200',
                        )}
                      >
                        {String(i + 1).padStart(2, '0')} {r.room}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {count > 1 ? (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause the rooms' : 'Play the rooms'}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-high-vis-white transition-colors hover:text-neutral-300"
              >
                {playing ? (
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                ) : (
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M7 5v14l12-7z" /></svg>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
