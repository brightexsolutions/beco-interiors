'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { AnnouncementBarItem } from '@/lib/announcements';

export type { AnnouncementBarItem };

/**
 * The announcement bar, per D36, now a rotating strip.
 *
 * Above the header, full width, RENDERED ON THE SERVER with its height part of
 * the first paint. A bar that appears after paint and pushes the page down is
 * a direct CLS failure, and CLS is in the performance budget. The height is a
 * fixed single line whatever is showing, so a rotation never shifts the page.
 *
 * It cycles through every live announcement plus Beco's phone and email, so a
 * quiet week still has something in the slot and the way to get in touch is
 * never more than a few seconds off screen. Scheduling stays the database's
 * job: the RLS policy only returns rows that are active and inside their
 * window, so a mid year sale appears and retires on its own. See D36 and D49.
 *
 * A clearance item turns the whole bar Warm Red for the seconds it is up, so
 * it reads as genuinely different from the site chrome. Everything else is
 * charcoal, which keeps Warm Red rationed.
 *
 * Client component, because the rotation is a timer. It still server renders
 * its first item, so the slot is filled and sized on first paint. Under
 * `prefers-reduced-motion`, or with only one item, it does not rotate: it
 * shows the first item and stays there. It also pauses while the pointer is
 * over it or a link inside it holds focus, so a reader is never robbed of the
 * line mid sentence.
 *
 * Sits BELOW the header in z-order (`z-30`). The header is `z-50` and its own
 * stacking context, so the mobile menu panel inside it stays above this.
 *
 * Dismissible, on request, and the dismissal is `sessionStorage`, not
 * `localStorage`: it should return in a fresh tab, only staying closed for
 * the tab a reader actually closed it in. Read in a `useEffect`, after the
 * server's own markup has already painted with the bar showing, rather than
 * gated on first render: a state initializer reading `sessionStorage` would
 * make the CLIENT's first render disagree with what the SERVER sent, which
 * is a hydration mismatch, not a clean hide. The brief flash this trades for
 * on a reload of an already-dismissed tab is the standard, accepted cost of
 * that fix, and only ever happens on a reload of a tab that already asked
 * to not see this.
 */

const TONE = {
  charcoal: 'bg-charcoal text-high-vis-white',
  clearance: 'bg-warm-red-deep text-high-vis-white',
} as const;

const ROTATE_MS = 5500;
const DISMISS_KEY = 'beco-announcement-dismissed';

/** One announcement line: label, then its body, then its call to action. */
function Line({
  item,
  className,
  onAnimationEnd,
}: {
  item: AnnouncementBarItem;
  className?: string;
  onAnimationEnd?: () => void;
}) {
  const body = item.text ? (
    item.href && !item.cta ? (
      <Link href={item.href} className="underline underline-offset-4 hover:no-underline">
        {item.text}
      </Link>
    ) : (
      <span className="text-high-vis-white/75">{item.text}</span>
    )
  ) : null;

  return (
    <p
      onAnimationEnd={onAnimationEnd}
      className={`flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-ui text-sm${
        className ? ` ${className}` : ''
      }`}
    >
      <span className="font-semibold uppercase tracking-[0.12em]">{item.label}</span>
      {body ? (
        // A bare contact line has no label to fall back on when the screen is
        // narrow, so it always shows. An announcement body is the first to drop.
        <span className={item.key === 'email' || item.key === 'call' ? 'inline' : 'hidden sm:inline'}>
          {body}
        </span>
      ) : null}
      {item.cta && item.href ? (
        <Link href={item.href} className="font-semibold underline underline-offset-4 hover:no-underline">
          {item.cta}
        </Link>
      ) : null}
    </p>
  );
}

/** Removed from `<body>` on dismissal too: it is what the hero's own fixed
    top padding keys off, see `.beco-hero-content-top` in tokens.css, and
    leaving it set after the bar is actually gone would reserve space for a
    strip that no longer renders. */
const clearAnnouncementSpacing = () => {
  try {
    document.body.removeAttribute('data-announcement');
  } catch {
    // Best effort. A stray gap above the hero is not worth failing over.
  }
};

export function AnnouncementBar({ items }: { items: AnnouncementBarItem[] }) {
  const clean = useMemo(() => items.filter((i) => i.label?.trim()), [items]);
  const [index, setIndex] = useState(0);
  // The line on its way out. Rendered over the incoming one for the length of
  // the roll, then dropped, so a change reads as the old line leaving upward
  // and the new one arriving from below rather than a straight cut.
  const [leaving, setLeaving] = useState<number | null>(null);
  const paused = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  // Starts false, matching what the server sent, then checks sessionStorage
  // once mounted: reading it in a state initializer instead would make the
  // client's first render disagree with the server's, a hydration mismatch
  // rather than a clean hide. See the component doc comment above.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
        setDismissed(true);
        clearAnnouncementSpacing();
      }
    } catch {
      // Private browsing or a blocked store: the bar just stays visible,
      // which is the safe direction to fail in.
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    clearAnnouncementSpacing();
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Best effort: worst case it reappears on the next navigation in this
      // same tab, which is not a broken feature, just a quieter one.
    }
  };

  useEffect(() => {
    if (clean.length < 2) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let drop = 0;
    const id = window.setInterval(() => {
      if (!paused.current && document.visibilityState === 'visible') {
        setIndex((n) => {
          setLeaving(n);
          return (n + 1) % clean.length;
        });
        window.clearTimeout(drop);
        drop = window.setTimeout(() => setLeaving(null), 700);
      }
    }, ROTATE_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(drop);
    };
  }, [clean.length]);

  if (clean.length === 0 || dismissed) return null;
  const i = Math.min(index, clean.length - 1);
  const item = clean[i]!;
  const tone = TONE[item.tone ?? 'charcoal'];

  return (
    <aside
      aria-label="Announcements"
      className={`relative z-30 transition-colors duration-500 ${tone}`}
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
      onFocusCapture={() => {
        paused.current = true;
      }}
      onBlurCapture={() => {
        paused.current = false;
      }}
    >
      {/* Clipped and fixed height, so the roll never spills or moves the page.
          The reduced-motion reset in tokens.css collapses both animations, and
          the rotation itself does not arm under reduced motion anyway. */}
      <div className="relative mx-auto flex min-h-[2.75rem] max-w-[1380px] items-center justify-center overflow-hidden px-8 sm:px-10 lg:px-14 py-2.5 sm:py-3">
        <Line key={i} item={item} className="beco-bar-in relative" />
        {leaving !== null && leaving !== i ? (
          <Line
            key={`leaving-${leaving}`}
            item={clean[Math.min(leaving, clean.length - 1)]!}
            className="beco-bar-out absolute inset-x-6"
            onAnimationEnd={() => setLeaving(null)}
          />
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center sm:right-8 lg:right-12"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8">
            <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
