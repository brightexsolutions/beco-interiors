'use client';

import { useEffect } from 'react';
import { isAnalyticsEvent, track } from '@/lib/analytics';

/**
 * The one listener behind every `data-analytics="..."` on the storefront.
 * D128. Renders nothing.
 *
 * Delegated from `document` rather than wired per control, so a new call or
 * WhatsApp link is tracked by carrying the attribute and nothing else.
 * Capture phase, so a component that stops propagation on its own click
 * cannot hide the event. Passive, and it never calls preventDefault: the
 * link still dials or opens WhatsApp exactly as it would without analytics.
 *
 * A name the analytics_events policy would refuse (migration 60) is ignored
 * here rather than sent and rejected.
 */
export function AnalyticsListener() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const tagged = target.closest('[data-analytics]');
        const name = tagged?.getAttribute('data-analytics');
        if (isAnalyticsEvent(name)) track(name);
      } catch {
        // Analytics never breaks a click.
      }
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
