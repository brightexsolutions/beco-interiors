'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Cycles a card's photographs while the pointer is on it, or on its own where
 * there is no pointer to hover with.
 *
 * A product card shows one image, but most of these stones have four to six,
 * and the difference between a slab and the same stone in a finished room is
 * the whole decision. Cycling on hover shows that without asking anyone to
 * open the page first.
 *
 * `(hover: none)`, not a viewport width: a touch phone or tablet has no
 * pointer capable of hovering at all, so the extra photographs, and even the
 * dots saying more exist, were simply never seen there, reported directly.
 * Checked as a media feature rather than a breakpoint because that is what
 * actually varies, a touchscreen laptop or a mouse on a small window are
 * exactly the cases a width guess gets wrong. On such a device the cycle
 * starts on mount instead of waiting for an enter or a focus that can never
 * come, and the dot row is shown plainly rather than only on hover.
 *
 * Every frame stays mounted and crossfades, so nothing is fetched on hover and
 * there is no blank while a file decodes. The cost is paid by the grid's
 * `sizes` attribute, which is already loading these at card width.
 *
 * Stops on leave and resets to the first frame, so the grid is never left in
 * an arbitrary state. Does nothing at all under reduced motion.
 */
export function HoverGallery({
  frames, intervalMs = 1100, className,
}: { frames: ReactNode[]; intervalMs?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const mq = window.matchMedia?.('(hover: none)');
    if (!mq) return undefined;
    const sync = () => setAutoCycle(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    if (frames.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    clearInterval(timer.current);
    timer.current = setInterval(
      () => setIndex((i) => (i + 1) % frames.length),
      intervalMs,
    );
  };

  const stop = () => {
    clearInterval(timer.current);
    setIndex(0);
  };

  // Runs itself the moment a device with no hover is known, rather than
  // waiting on an enter or a focus event that a touchscreen never sends.
  useEffect(() => {
    if (!autoCycle) return undefined;
    start();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCycle]);

  return (
    <div
      className={className}
      onMouseEnter={autoCycle ? undefined : start}
      onMouseLeave={autoCycle ? undefined : stop}
      // Keyboard users reach the card through its link, so focus within the
      // card starts it too rather than the effect being pointer only.
      onFocus={autoCycle ? undefined : start}
      onBlur={autoCycle ? undefined : stop}
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
          more than one, and only once cycling has actually moved. Plainly
          visible rather than hover gated on a device with no hover, or the
          affordance saying more photographs exist would itself be invisible. */}
      {frames.length > 1 ? (
        <div
          aria-hidden
          className={[
            'pointer-events-none absolute inset-x-3 bottom-3 flex gap-1 transition-opacity duration-300',
            autoCycle ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
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
