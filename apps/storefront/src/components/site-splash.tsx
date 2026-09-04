'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SITE } from '@/lib/site';

const SEEN_KEY = 'beco_splash_seen_v1';

/**
 * The brand moment on arrival: the mark and the strapline, held for a beat
 * over charcoal, then gone.
 *
 * **Engineered around the site's own performance budget, not against it.**
 * This is a real tension worth stating plainly: LCP is measured under 2.0s
 * and the entire quote flow exists to be faster than writing an order on
 * paper, and a splash screen is, by definition, something between a reader
 * and the page they came for. Three things keep it from actually costing
 * either.
 *
 * 1. CLIENT ONLY. This component renders nothing during SSR and mounts after
 *    the real page has already painted, so it can never be measured as the
 *    LCP candidate: Chrome's largest paint is recorded from the actual hero
 *    content that was already in the server rendered HTML, before this
 *    overlay exists at all. It sits on top, it does not replace what is
 *    underneath, and nothing about the real page waits for it.
 * 2. ONCE PER SESSION, not once per page. `sessionStorage`, not a cookie or
 *    a render on every navigation: a salesperson moving between the shop,
 *    a product and the quote form must never see this twice, or the "faster
 *    than paper" promise breaks on the second click.
 * 3. UNDER A SECOND AND UNSKIPPABLE ONLY BECAUSE IT IS SHORT. No button, no
 *    wait for a click, because the moment it becomes something to get past
 *    it has become friction rather than a moment. `prefers-reduced-motion`
 *    skips it outright, immediately, with nothing rendered.
 *
 * `position: fixed` and removed from flow entirely once it is done, so it
 * cannot shift the layout underneath it either arriving or leaving: CLS is
 * unaffected either way.
 */
export function SiteSplash() {
  const [phase, setPhase] = useState<'hidden' | 'in' | 'out'>('hidden');

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
      // Private browsing or storage disabled: treat as unseen rather than
      // throwing, and it will simply show once per tab instead of once per
      // session, which is a harmless fallback rather than a broken page.
    }
    if (seen) return;

    setPhase('in');
    const toOut = setTimeout(() => setPhase('out'), 900);
    const toHidden = setTimeout(() => setPhase('hidden'), 1300);
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* see above */
    }
    return () => {
      clearTimeout(toOut);
      clearTimeout(toHidden);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      aria-hidden
      className={[
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-charcoal',
        'transition-opacity duration-400 ease-brand',
        phase === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <div className="beco-splash-mark">
        <Image src="/logo-mark-white.png" alt="" width={400} height={390} priority className="h-16 w-auto sm:h-20" />
      </div>
      <p className="beco-splash-line font-ui text-xs font-semibold uppercase tracking-[0.28em] text-neutral-300">
        {SITE.strapline}
      </p>
    </div>
  );
}
