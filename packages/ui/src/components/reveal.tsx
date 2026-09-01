'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * The default motion everywhere: fade plus a 16px rise, once, on entry.
 *
 * Transform and opacity only, never layout properties, so a reveal cannot
 * cost CLS. `once` is deliberate: an element that re-animates every time it
 * re-enters turns a long page into a flicker reel.
 *
 * Under prefers-reduced-motion the content is simply present. That is handled
 * in CSS rather than by branching here, so there is no flash of hidden content
 * for a reduced-motion user while JavaScript loads.
 */
export interface RevealProps {
  children: ReactNode;
  /** Milliseconds. Grids stagger their items by 60ms per the motion rules. */
  delay?: number | undefined;
  as?: 'div' | 'li' | 'section' | undefined;
  className?: string | undefined;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If the browser cannot observe, show the content rather than hide it.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-revealed={shown ? '' : undefined}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'translate-y-4 opacity-0 transition-[opacity,transform] duration-500 ease-brand',
        'data-revealed:translate-y-0 data-revealed:opacity-100',
        'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
