'use client';

import { useEffect } from 'react';

/**
 * Drives the entrance animations, once, for the whole page.
 *
 * Why this exists rather than pure CSS: `animation-timeline: view()` is the
 * better mechanism and costs nothing on the main thread, but it ships in
 * Chromium only and it is silently absent everywhere else, which means the
 * site's motion either works or does not depending on the reader's browser.
 * For scroll LINKED effects, parallax and scale-and-crop, that is an
 * acceptable enhancement. For the reveals, which are most of the page's
 * character, it is not.
 *
 * So one observer marks elements `data-inview` as they arrive, and the CSS
 * animates off that attribute. The important property is the default: an
 * element with no attribute is fully visible, so if this never runs the page
 * is complete and merely still. Nothing is hidden waiting for JavaScript.
 *
 * One observer for the document, not one per element, and each element is
 * unobserved once it has fired.
 */
const SELECTOR =
  '.beco-reveal, .beco-rise, .beco-card-flip, .beco-rail-card, .beco-wipe, .beco-zoom';

export function ScrollMotion() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute('data-inview', '');
          observer.unobserve(entry.target);
        }
      },
      // Fires a little before the element is fully on screen, so the motion
      // reads as arriving rather than as catching up.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll(SELECTOR)) {
        if (seen.has(el) || el.hasAttribute('data-inview')) continue;
        seen.add(el);
        observer.observe(el);
      }
    };
    scan();

    // Client navigation swaps the page without remounting this, so watch for
    // new nodes rather than assuming one scan is enough.
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
