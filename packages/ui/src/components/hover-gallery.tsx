'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Cycles a card's photographs while the pointer is on it.
 *
 * A product card shows one image, but most of these stones have four to six,
 * and the difference between a slab and the same stone in a finished room is
 * the whole decision. Cycling on hover shows that without asking anyone to
 * open the page first.
 *
 * Every frame stays mounted and crossfades, so nothing is fetched on hover and
 * there is no blank while a file decodes. The cost is paid by the grid's
 * `sizes` attribute, which is already loading these at card width.
 *
 * Stops on leave and resets to the first frame, so the grid is never left in
 * an arbitrary state. Does nothing at all under reduced motion.
 *
 * Touch has no hover event at all, so a phone reader could never trigger this
 * and the sibling photographs were simply unreachable there, no matter what
 * the caption beside the card said. `(hover: none)` identifies that reader
 * on mount and starts the same cycle unprompted, the same auto-advance
 * PinnedHero already runs on mobile, rather than inventing a second, tap
 * driven mechanism a reader would have to discover.
 */
export function HoverGallery({
  frames, intervalMs = 1100, className,
}: { frames: ReactNode[]; intervalMs?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  // Also gates whether the tick row below stays visible without a hover
  // state to reveal it: a touch reader has no group-hover to opt into.
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    clearInterval(timer.current);
    if (frames.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia?.('(hover: none)').matches) return;
    setTouch(true);
    timer.current = setInterval(
      () => setIndex((i) => (i + 1) % frames.length),
      intervalMs,
    );
    return () => clearInterval(timer.current);
    // frames.length, not frames itself: the array is a fresh ReactNode[] on
    // every render of the caller, which would otherwise restart the timer
    // on every tick it causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length, intervalMs]);

  const start = () => {
    if (touch) return;
    if (frames.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    clearInterval(timer.current);
    timer.current = setInterval(
      () => setIndex((i) => (i + 1) % frames.length),
      intervalMs,
    );
  };

  const stop = () => {
    if (touch) return;
    clearInterval(timer.current);
    setIndex(0);
  };

  return (
    <div
      className={className}
      onMouseEnter={start}
      onMouseLeave={stop}
      // Keyboard users reach the card through its link, so focus within the
      // card starts it too rather than the effect being pointer only.
      onFocus={start}
      onBlur={stop}
    >
      {frames.map((frame, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className={[
            'absolute inset-0 transition-opacity duration-500 ease-brand',
            'motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {frame}
        </div>
      ))}

      {/* Which frame, as a row of ticks. Only worth showing while there is
          more than one. Always on for the touch reader driving this itself,
          since there is no hover state to reveal it on that device. */}
      {frames.length > 1 ? (
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-x-3 bottom-3 flex gap-1 transition-opacity duration-300',
            touch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          {frames.map((_, i) => (
            <span
              key={i}
              className={[
                'h-0.5 flex-1 transition-colors duration-300',
                i === index ? 'bg-high-vis-white' : 'bg-high-vis-white/35',
              ].join(' ')}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
