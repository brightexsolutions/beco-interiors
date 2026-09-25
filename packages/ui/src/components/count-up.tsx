'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts once as it enters, then stays still.
 *
 * The final value is rendered on the server and is the element's text content
 * from the first paint, so a crawler, a reduced-motion user and anyone whose
 * JavaScript has not arrived all read the real number. The animation only ever
 * counts up TO what is already there.
 */
export interface CountUpProps {
  value: number;
  durationMs?: number | undefined;
  className?: string | undefined;
}

export function CountUp({ value, durationMs = 1200, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // Expo out, matching the reveal easing so the page has one feel.
        setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setDisplay(0);
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return <span ref={ref} className={className}>{display}</span>;
}
