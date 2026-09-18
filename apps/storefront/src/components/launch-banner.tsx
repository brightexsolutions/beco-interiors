'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { countdownTo } from '@/lib/countdown';
import type { LaunchState } from '@/lib/launch';

/**
 * Beco's first anniversary and the site launch timed to land in the same
 * October, per Irene. See migration 25, D80 and `apps/dashboard`'s launch
 * control, which is the only thing that ever sets `launch.isLive`.
 *
 * Renders in the SAME slot as AnnouncementBar, and only one of the two ever
 * shows: see layout.tsx. Same wrapper shape and z index, so the hero's
 * `data-announcement` spacing contract does not need to know which one is
 * currently occupying it.
 *
 * A client component, unlike AnnouncementBar, because a countdown has to
 * tick. The countdown MATH is intentionally NOT rendered on the first paint:
 * the server does not know the visitor's clock, so a number computed there
 * would be a few seconds stale by the time it hydrates, and re-hydrating a
 * mismatched number is worse than a beat of silence before it appears.
 *
 * The reveal is a CLICK, not a clock. `launch.isLive` only ever becomes true
 * from apps/dashboard's own button, because a first anniversary is a real
 * moment with people in the room, not a value a cron job flips at midnight.
 * There is no realtime push for it (`settings` is not in the realtime
 * publication, and stays that way per docs/SCHEMA.md), so a tab already open
 * when the switch is thrown keeps its own countdown until its next load.
 * That is a deliberate scope line, not an oversight: the fix is a fresh
 * visitor, a few seconds later, on a new page.
 */
const SEEN_KEY = 'beco-launch-seen';

// Twenty pieces, positions and delays fixed rather than random so the layout
// is stable across renders. Only one in four uses Warm Red, which the brand
// system rations to three or four appearances a page: the rest are Charcoal
// and High-Vis White.
const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 37 + 3) % 100}%`,
  delayMs: (i % 10) * 80,
  tone: i % 4 === 0 ? 'bg-warm-red' : i % 2 === 0 ? 'bg-high-vis-white' : 'bg-neutral-400',
}));

const reducedMotion = (): boolean => {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
};

export function LaunchBanner({ launch }: { launch: LaunchState }) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => setMounted(true), []);

  // The countdown itself, ticking only while there is one to show.
  useEffect(() => {
    if (!launch.launchAt || launch.isLive) return undefined;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [launch.launchAt, launch.isLive]);

  // The one time reveal, played once per browser, never again for the same
  // visitor. localStorage is the right tool here: a per viewer convenience,
  // never read back by anything else, so a private window or a cleared
  // profile simply replays it once more, which costs nothing real.
  useEffect(() => {
    if (!launch.isLive) return;
    let alreadySeen = true;
    try {
      alreadySeen = window.localStorage.getItem(SEEN_KEY) === 'true';
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) return;
    if (!reducedMotion()) setCelebrate(true);
    try {
      window.localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      // Best effort. Replaying the reveal once more for this visitor is not a bug.
    }
  }, [launch.isLive]);

  // The confetti overlay unmounts itself rather than sitting inert forever.
  useEffect(() => {
    if (!celebrate) return undefined;
    const id = setTimeout(() => setCelebrate(false), 2600);
    return () => clearTimeout(id);
  }, [celebrate]);

  if (!launch.launchAt && !launch.isLive) return null;

  if (launch.isLive) {
    return (
      <>
        {celebrate ? (
          // A fixed overlay, not a child of the bar, so the fall can spill
          // past it over the header and the top of the hero rather than being
          // clipped to a 47px strip. z above the header, pointer-events-none
          // so it never intercepts a click, and it unmounts after 2.6s so
          // nothing loops in a reader's peripheral vision.
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-56 overflow-hidden"
          >
            {CONFETTI.map((piece, i) => (
              <span
                key={i}
                className={`beco-confetti-piece absolute top-0 h-2.5 w-2.5 ${piece.tone}`}
                style={{ left: piece.left, animationDelay: `${piece.delayMs}ms` }}
              />
            ))}
          </div>
        ) : null}
        <aside
          aria-label="Announcement"
          className="relative z-30 bg-charcoal text-high-vis-white"
        >
          <div className={`mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-2.5 sm:py-3 ${celebrate ? 'beco-launch-reveal' : ''}`}>
            <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-ui text-sm">
              <span className="font-semibold uppercase tracking-[0.12em]">One year in Nairobi.</span>
              <span className="hidden text-neutral-300 sm:inline">Beco is live.</span>
              <Link
                href="/gallery"
                className="font-semibold underline underline-offset-4 hover:no-underline"
              >
                See the year in projects
              </Link>
            </p>
          </div>
        </aside>
      </>
    );
  }

  const parts = mounted && launch.launchAt ? countdownTo(launch.launchAt, now) : null;

  return (
    <aside aria-label="Announcement" className="relative z-30 bg-charcoal text-high-vis-white">
      <div className="mx-auto max-w-[1380px] px-8 sm:px-10 lg:px-14 py-2.5 sm:py-3">
        <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-ui text-sm">
          <span className="font-semibold uppercase tracking-[0.12em]">Beco turns one this October.</span>
          {parts ? (
            parts.reached ? (
              <span className="text-neutral-300">Live any moment.</span>
            ) : (
              <span className="tabular-nums text-neutral-300">
                Live in {parts.days}d {String(parts.hours).padStart(2, '0')}h{' '}
                {String(parts.minutes).padStart(2, '0')}m
              </span>
            )
          ) : null}
        </p>
      </div>
    </aside>
  );
}
