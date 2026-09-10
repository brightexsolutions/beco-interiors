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
 */

const TONE = {
  charcoal: 'bg-charcoal text-high-vis-white',
  clearance: 'bg-warm-red-deep text-high-vis-white',
} as const;

const ROTATE_MS = 5500;

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

export function AnnouncementBar({ items }: { items: AnnouncementBarItem[] }) {
  const clean = useMemo(() => items.filter((i) => i.label?.trim()), [items]);
  const [index, setIndex] = useState(0);
  // The line on its way out. Rendered over the incoming one for the length of
  // the roll, then dropped, so a change reads as the old line leaving upward
  // and the new one arriving from below rather than a straight cut.
  const [leaving, setLeaving] = useState<number | null>(null);
  const paused = useRef(false);

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

  if (clean.length === 0) return null;
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
      <div className="relative mx-auto flex min-h-[2.75rem] max-w-[1380px] items-center justify-center overflow-hidden px-6 py-2.5 sm:py-3">
        <Line key={i} item={item} className="beco-bar-in relative" />
        {leaving !== null && leaving !== i ? (
          <Line
            key={`leaving-${leaving}`}
            item={clean[Math.min(leaving, clean.length - 1)]!}
            className="beco-bar-out absolute inset-x-6"
            onAnimationEnd={() => setLeaving(null)}
          />
        ) : null}
      </div>
    </aside>
  );
}
