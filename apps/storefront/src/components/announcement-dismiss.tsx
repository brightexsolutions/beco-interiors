'use client';

import { useState } from 'react';
import { DISMISS_COOKIE } from '@/lib/announcements';

/**
 * Dismissal is a COOKIE, not localStorage.
 *
 * The bar is server rendered so it cannot push the page down after paint,
 * which is a direct CLS failure and CLS is in the performance budget. But
 * remembering the dismissal client side would reintroduce exactly that on
 * every later visit: the server would render the bar, the browser would read
 * storage, and the bar would vanish after paint.
 *
 * A cookie is sent with the request, so the server already knows and simply
 * does not render it. No flash, no shift, and no inline script to work around
 * the content security policy.
 *
 * Keyed by announcement id, so a NEW announcement reappears rather than
 * staying dismissed forever.
 */
export function AnnouncementDismiss({ id }: { id: string }) {
  const [gone, setGone] = useState(false);

  if (gone) return null;

  return (
    <button
      type="button"
      aria-label="Dismiss this announcement"
      onClick={() => {
        // 90 days. Long enough to not nag, short enough that a stale cookie
        // cannot outlive the announcement it refers to by much.
        document.cookie =
          `${DISMISS_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
        setGone(true);
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-300 transition-colors hover:text-high-vis-white"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="2">
        <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
      </svg>
    </button>
  );
}
