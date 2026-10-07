'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, Ref, RefObject } from 'react';
import Link from 'next/link';
import type { AnnouncementBarItem } from '@/lib/announcements';

export type { AnnouncementBarItem };

/**
 * The announcement bar, per D36, now a rotating strip.
 *
 * Above the header, full width, RENDERED ON THE SERVER with its height part of
 * the first paint. A bar that appears after paint and pushes the page down is
 * a direct CLS failure, and CLS is in the performance budget. The height is a
 * FIXED single line, `h-12`, whatever is showing: the label, the body and the
 * call to action always share one row, so neither a rotation nor a long
 * announcement nor the ticker starting can move the page. That 3rem is also
 * what `.beco-hero-bleed` in tokens.css assumes the bar to be.
 *
 * It cycles through every live announcement plus Beco's phone and email, so a
 * quiet week still has something in the slot and the way to get in touch is
 * never more than a few seconds off screen. Scheduling stays the database's
 * job: the RLS policy only returns rows that are active and inside their
 * window, so a mid year sale appears and retires on its own. See D36 and D49.
 *
 * A line that FITS sits still and centred. A line that does not, measured
 * with a ResizeObserver rather than guessed from its length, becomes a ticker:
 * a seamless loop of two copies moving left at a constant 48px a second, so
 * a longer line takes longer rather than moving faster. The second copy is
 * `aria-hidden` and `inert`, so a screen reader hears the announcement once
 * and the tab order holds one link. It pauses under the pointer and while
 * focus is inside it, and if keyboard focus lands on a link the ticker has
 * carried out of view, it stops and brings that link back in. While a ticker
 * is running, the rotation waits for it to finish a full pass rather than
 * cutting it off mid sentence.
 *
 * Under `prefers-reduced-motion` there is no ticker. The line stays on one row
 * with the BODY truncated by an ellipsis, while the label and the call to
 * action stay whole, so the link is always visible and reachable. Wrapping
 * instead would grow the bar and break the fixed height the hero is laid out
 * against. The full body is still in the DOM, so a screen reader reads all of
 * it, and the whole line is in the row's `title` for a pointer. The same truncated layout is what the
 * server sends, so the first paint is a clean single row before any script.
 *
 * A clearance item turns the whole bar Warm Red for the seconds it is up, so
 * it reads as genuinely different from the site chrome. Everything else is
 * charcoal, which keeps Warm Red rationed.
 *
 * Client component, because the rotation is a timer and the overflow is a
 * measurement. Under `prefers-reduced-motion`, or with only one item, it does
 * not rotate. It also pauses while the pointer is over it or a link inside it
 * holds focus, so a reader is never robbed of the line mid sentence.
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

/** Ticker pace in pixels per second. Constant whatever the length. */
export const TICKER_PX_PER_S = 48;
/** The seam between one copy of the line and the next: `pr-16`. */
export const TICKER_GAP_PX = 64;

/** One announcement line: label, then its body, then its call to action.

    `fit` is the still layout: one row, and if that row is wider than the bar
    the body truncates while the label and the call to action stay whole.
    Without `fit` nothing truncates, which is the ticker's copy. `copy` marks
    the ticker's duplicate, whose links are taken out of the tab order. */
function Line({
  item,
  fit,
  copy = false,
  className,
  lineRef,
  bodyRef,
  onAnimationEnd,
}: {
  item: AnnouncementBarItem;
  fit: boolean;
  copy?: boolean;
  className?: string;
  lineRef?: Ref<HTMLParagraphElement>;
  bodyRef?: Ref<HTMLSpanElement>;
  onAnimationEnd?: () => void;
}) {
  const tab = copy ? -1 : undefined;
  const body = item.text ? (
    item.href && !item.cta ? (
      <Link href={item.href} tabIndex={tab} className="underline underline-offset-4 hover:no-underline">
        {item.text}
      </Link>
    ) : (
      <span className="text-high-vis-white/75">{item.text}</span>
    )
  ) : null;

  return (
    <p
      ref={lineRef}
      // The whole line, on the whole row, so a pointer can read what an
      // ellipsis cut wherever it lands, even where the body has no width left.
      title={fit && !copy && item.text ? `${item.label}: ${item.text}` : undefined}
      onAnimationEnd={onAnimationEnd}
      className={`flex items-baseline gap-x-3 whitespace-nowrap font-ui text-sm ${
        fit ? 'min-w-0 max-w-full' : 'shrink-0'
      }${className ? ` ${className}` : ''}`}
    >
      <span className={`font-semibold uppercase tracking-[0.12em]${fit ? ' min-w-0 truncate' : ''}`}>
        {item.label}
      </span>
      {body ? (
        <span
          ref={bodyRef}
          className={fit ? 'min-w-0 shrink-[1000] truncate' : undefined}
        >
          {body}
        </span>
      ) : null}
      {item.cta && item.href ? (
        <Link
          href={item.href}
          tabIndex={tab}
          className="shrink-0 font-semibold underline underline-offset-4 hover:no-underline"
        >
          {item.cta}
        </Link>
      ) : null}
    </p>
  );
}

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
};

/**
 * Whether the current line is wider than the bar, and how long one loop of
 * it takes at the ticker's constant pace.
 *
 * The natural width is the line's own width plus whatever its truncated body
 * is hiding, which gives the same answer in the still layout and in the
 * ticker one, so the bar cannot flip between the two on its own measurement.
 * A layout effect, so a rotation into a line of a different length is
 * measured before it paints rather than one frame after.
 */
function useOverflow(
  viewport: RefObject<HTMLDivElement | null>,
  line: RefObject<HTMLParagraphElement | null>,
  body: RefObject<HTMLSpanElement | null>,
  lineKey: string,
) {
  const [state, setState] = useState({ overflows: false, loopMs: 0 });

  useLayoutEffect(() => {
    const v = viewport.current;
    const l = line.current;
    if (!v || !l) return;

    const measure = () => {
      const b = body.current;
      const hidden = b ? Math.max(0, b.scrollWidth - b.clientWidth) : 0;
      const natural = l.offsetWidth + hidden;
      // One pixel of slack, so sub pixel rounding never starts a ticker.
      const overflows = natural > v.clientWidth + 1;
      const loopMs = overflows
        ? Math.round(((natural + TICKER_GAP_PX) / TICKER_PX_PER_S) * 1000)
        : 0;
      setState((prev) =>
        prev.overflows === overflows && prev.loopMs === loopMs ? prev : { overflows, loopMs },
      );
    };

    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      ro.observe(v);
      ro.observe(l);
    }
    // A web font swapping in changes the width without necessarily resizing
    // the clamped line box, so measure once more when the fonts are ready.
    let live = true;
    document.fonts?.ready.then(() => { if (live) measure(); }).catch(() => {});
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, [viewport, line, body, lineKey]);

  return state;
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
  // False on the server and on the first client render, so hydration agrees;
  // corrected once mounted, and kept in step if the setting changes.
  const [reduce, setReduce] = useState(false);
  // How far the ticker is held to the left while keyboard focus sits on a
  // link it had carried out of view. Null when focus is not doing that.
  const [focusShift, setFocusShift] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);

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

  useEffect(() => {
    setReduce(prefersReducedMotion());
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
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

  const i = Math.min(index, Math.max(clean.length - 1, 0));
  const item = clean[i];
  const { overflows, loopMs } = useOverflow(
    viewportRef,
    lineRef,
    bodyRef,
    `${i}:${item?.key ?? ''}:${dismissed}`,
  );
  const ticking = overflows && !reduce;
  const rotates = clean.length >= 2 && !reduce;

  const advance = () => {
    setFocusShift(null);
    setIndex((n) => {
      setLeaving(n);
      return (n + 1) % clean.length;
    });
  };

  // The roll's outgoing layer is dropped after the roll, by timer as well as
  // by its own animationend, since reduced motion never fires the latter.
  useEffect(() => {
    if (leaving === null) return;
    const id = window.setTimeout(() => setLeaving(null), 700);
    return () => window.clearTimeout(id);
  }, [leaving]);

  // A still line rotates on a timer. A ticking one rotates when its loop
  // completes instead, see `onAnimationIteration` below, so a long line is
  // always read to the end and a pause under the pointer is honoured.
  useEffect(() => {
    if (!rotates || ticking) return;
    let id = 0;
    const arm = () => {
      id = window.setTimeout(() => {
        if (paused.current || document.visibilityState !== 'visible') arm();
        else advance();
      }, ROTATE_MS);
    };
    arm();
    return () => window.clearTimeout(id);
    // `i` re-arms the full interval after every change of line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotates, ticking, i]);

  if (!item || dismissed) return null;
  const tone = TONE[item.tone ?? 'charcoal'];

  // Keyboard focus on a link the ticker has carried out of view: stop the
  // ticker and hold the line so the link's right edge sits inside the bar.
  // A link already in view only needs the CSS pause on `:focus-within`.
  const onTickerFocus = (e: FocusEvent<HTMLDivElement>) => {
    const v = viewportRef.current;
    const target = e.target as HTMLElement;
    if (!ticking || !v || !(target instanceof HTMLElement)) return;
    const vr = v.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    if (tr.left >= vr.left && tr.right <= vr.right) return;
    setFocusShift(Math.max(0, target.offsetLeft + target.offsetWidth - v.clientWidth));
  };
  const onTickerBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusShift(null);
  };

  const held = focusShift !== null;

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
      {/* Fixed height and clipped, so neither the roll, a long line nor the
          ticker can spill or move the page. */}
      <div className="relative mx-auto flex h-12 max-w-[1380px] items-center px-8 sm:px-24 lg:px-40">
        {/* `overflow-clip`, not `overflow-hidden`: a hidden box can still be
            scrolled by focus, which would knock the ticker out of register
            the moment a link inside it took focus. The phone inset keeps
            the line clear of the close button on the right, and mirrors it
            on the left so a still line stays truly centred. */}
        <div
          ref={viewportRef}
          data-testid="announcement-viewport"
          onFocus={onTickerFocus}
          onBlur={onTickerBlur}
          className={`beco-ticker relative mx-5 flex h-full min-w-0 flex-1 items-center overflow-clip sm:mx-0 ${
            ticking ? 'justify-start' : 'justify-center'
          }`}
        >
          <div className={`beco-bar-in flex ${ticking ? 'shrink-0' : 'min-w-0 max-w-full'}`} key={i}>
            <div
              data-testid="announcement-track"
              data-ticking={ticking && !held ? '' : undefined}
              onAnimationIteration={() => {
                if (rotates && !paused.current) advance();
              }}
              style={
                ticking
                  ? held
                    ? { transform: `translateX(-${focusShift}px)` }
                    : { animationDuration: `${loopMs}ms` }
                  : undefined
              }
              className={`beco-ticker-track relative flex ${ticking ? 'w-max' : 'min-w-0 max-w-full'}`}
            >
              <div className={ticking ? 'shrink-0 pr-16' : 'flex min-w-0 max-w-full'}>
                <Line item={item} fit={!ticking} lineRef={lineRef} bodyRef={bodyRef} />
              </div>
              {ticking ? (
                <div aria-hidden="true" inert data-testid="announcement-loop-copy" className="shrink-0 pr-16">
                  <Line item={item} fit={false} copy />
                </div>
              ) : null}
            </div>
          </div>
          {leaving !== null && leaving !== i ? (
            <div aria-hidden="true" inert className="absolute inset-0 flex items-center justify-center">
              <Line
                key={`leaving-${leaving}`}
                item={clean[Math.min(leaving, clean.length - 1)]!}
                fit
                copy
                className="beco-bar-out"
                onAnimationEnd={() => setLeaving(null)}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center sm:right-8 lg:right-12"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8">
            <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
