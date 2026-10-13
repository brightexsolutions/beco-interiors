'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * A thin bar across the top while the next screen loads, D141. Filters and
 * saves already say what they are doing (D117); a tap on a nav link did
 * not, and on a slow connection the old screen sat there for seconds with
 * nothing to say the tap had taken. The bar starts when an in-app link is
 * pressed, creeps to show life, and finishes when the URL changes.
 *
 * Listens to clicks at the document, so no link has to know about it, and
 * leaves alone anything that opens a new tab, a download, or another site.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const timer = useRef<number | null>(null);
  const key = `${pathname}?${searchParams.toString()}`;
  const started = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;
      if (!href.startsWith('/') || href.startsWith('//')) return;
      const target = new URL(href, window.location.href);
      const here = `${window.location.pathname}${window.location.search}`;
      if (`${target.pathname}${target.search}` === here) return;
      started.current = key;
      setActive(true);
      setWidth(12);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [key]);

  // The URL changed: the screen is here.
  useEffect(() => {
    if (!active) return;
    if (started.current === key) return;
    setWidth(100);
    const done = window.setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 220);
    return () => window.clearTimeout(done);
  }, [key, active]);

  // Creep, so the bar reads as alive rather than stuck, and give up after a
  // while so a link that opened nothing does not leave it on screen.
  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    timer.current = window.setInterval(() => {
      setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w));
      if (Date.now() - startedAt > 20_000) {
        setActive(false);
        setWidth(0);
      }
    }, 200);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div role="progressbar" aria-label="Loading the next screen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)} className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 bg-neutral-200/60">
      <div
        className="h-full bg-warm-red transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${width}%` }}
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
