'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SITE } from '@/lib/site';

const SEEN_KEY = 'beco_splash_seen_v1';

// Computed once at module scope, not per render, and read by both the JSX
// below and the timing math in the effect, so the two cannot see a
// different pillar count from one another.
const PILLARS = SITE.strapline.split(' · ');

// These four numbers have to describe the SAME sequence
// packages/ui/src/tokens/motion.css draws. The pillar stagger base and gap
// are here because each pillar's delay is an inline style computed per
// pillar below; PILLAR_DURATION mirrors .beco-splash-pillar's own animation
// duration in that file, and FADE_DURATION mirrors the duration-400 class
// on the overlay itself, further down.
//
// This drifted once already: the strapline entrance was extended from one
// block of text to four pillars stepping in one after another, and the
// setTimeout schedule below was never moved to match, so the overlay
// started fading, and then unmounted outright, while the last pillar or two
// were still animating in. Reported directly as "disappears before the
// animation is done." There is no single source of truth across a .css file
// and this .tsx file, so a future change to either side's numbers has to
// change this block too, or it drifts again the same way.
const PILLAR_BASE_DELAY = 820; // ms, the FIRST pillar's animationDelay below
const PILLAR_STAGGER = 110; // ms added per pillar after the first
const PILLAR_DURATION = 500; // ms, .beco-splash-pillar in motion.css
const FADE_DURATION = 400; // ms, the duration-400 class below
const HOLD_AFTER_ENTRANCE = 250; // ms the finished splash sits still before fading
// Exported so the regression test for the bug these describe reads these
// numbers rather than hardcoding its own parallel copy, which is exactly
// how the bug happened the first time.
export const LAST_PILLAR_ENDS =
  PILLAR_BASE_DELAY + (PILLARS.length - 1) * PILLAR_STAGGER + PILLAR_DURATION;
export const FADE_STARTS_AT = LAST_PILLAR_ENDS + HOLD_AFTER_ENTRANCE;
export const HIDDEN_AT = FADE_STARTS_AT + FADE_DURATION;

/**
 * The brand moment on arrival: the mark comes into focus, the rule draws,
 * the four pillars of the strapline step in, held for a beat over charcoal,
 * then gone.
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
 * 3. BRIEF, AND UNSKIPPABLE ONLY BECAUSE IT IS BRIEF: `HIDDEN_AT` below,
 *    roughly 2.3s from mark to gone. No button, no wait for a click, because
 *    the moment it becomes something to get past it has become friction
 *    rather than a moment. `prefers-reduced-motion`
 *    skips it outright, immediately, with nothing rendered. `pointer-events`
 *    is `none` for the entire lifecycle, not only while fading, so it can
 *    never swallow a scroll, a tap or a click underneath it either.
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
    const toOut = setTimeout(() => setPhase('out'), FADE_STARTS_AT);
    const toHidden = setTimeout(() => {
      setPhase('hidden');
      // Marked as seen only once the sequence has actually finished, not at
      // the start. React 18 Strict Mode double invokes this effect in dev,
      // synchronously: mount, cleanup, mount again, before any timer can
      // fire. Writing "seen" immediately meant the FIRST invocation wrote
      // it and scheduled timers, the Strict Mode remount's cleanup cancelled
      // those timers, and the SECOND invocation read "seen" as already true
      // and returned early without scheduling anything to replace them.
      // Phase stayed 'in' forever: a fully opaque splash that never
      // proceeded to 'out' or 'hidden', on every first load, in dev. Both
      // invocations now take the identical path, since neither can see a
      // write the other made, and cleanup-then-reschedule under Strict Mode
      // is the normal, harmless case this pattern is meant to survive.
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* see above */
      }
    }, HIDDEN_AT);
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
        'pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-charcoal',
        'transition-opacity duration-400 ease-brand',
        phase === 'out' ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <div className="beco-splash-mark">
        <Image
          src="/logo-mark-white.png"
          alt=""
          width={400}
          height={390}
          priority
          className="h-16 w-auto sm:h-20"
        />
      </div>

      <span aria-hidden className="beco-splash-rule h-px w-10 bg-warm-red" />

      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 text-center font-ui text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
        {PILLARS.map((pillar, i) => (
          <span
            key={pillar}
            className="beco-splash-pillar"
            style={{ animationDelay: `${PILLAR_BASE_DELAY + i * PILLAR_STAGGER}ms` }}
          >
            {pillar}
            {i < PILLARS.length - 1 ? (
              <span aria-hidden className="ml-3 text-warm-red">
                ·
              </span>
            ) : null}
          </span>
        ))}
      </p>
    </div>
  );
}
