'use client';

import { useEffect, useState } from 'react';
import { SITE, whatsappLink } from '@/lib/site';
import { cn } from '@beco/ui';

/**
 * The two conversation actions: WhatsApp and the business line.
 *
 * It used to carry a full width "Request a quote" as well, which was the third
 * copy of that button on screen at once: the header has it, sticky, and the
 * page body has it. Repeating a call to action does not strengthen it, it just
 * costs the reader the bottom of every page.
 *
 * So the header keeps the primary action, per D26, and this bar carries the
 * two that a phone is uniquely good at. It is the one place tapping is faster
 * than typing.
 *
 * Hidden until the reader scrolls, reported directly by screenshot: sitting
 * fixed over the very first screen of every page, it covered the gallery's
 * opening video, its scroll cue included, before anyone had done anything.
 * The same `window.scrollY > 8` threshold `SiteHeader` already uses for its
 * own scrolled state, so "has this reader scrolled" means one thing across
 * the site rather than two thresholds nobody chose on purpose. A live
 * toggle, not a once seen flag: scrolling back to the very top hides it
 * again, since the opening screen it was covering is back too.
 *
 * Fixed to the bottom with safe area inset, so it clears the iOS home
 * indicator. Whether it clears the on screen keyboard is a real device check,
 * and it is in docs/QA-CHECKLIST.md rather than assumed here.
 */
export function MobileActionBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Passive, and it only ever flips a boolean, so it cannot become a
    // scroll handler that costs INP.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden={!scrolled}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-high-vis-white/95 backdrop-blur',
        'pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-brand md:hidden',
        'motion-reduce:transition-none',
        scrolled ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="grid grid-cols-2 items-stretch gap-2 p-2">
        <a
          href={whatsappLink()}
          data-analytics="whatsapp_click"
          // Off screen until scrolled, so keyboard focus skips straight past
          // it rather than landing on a link nobody can see yet.
          tabIndex={scrolled ? undefined : -1}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[2px] bg-charcoal px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-high-vis-white"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.42 1.31-1.95 1.36-.5.05-.98.23-3.3-.69-2.77-1.09-4.54-3.92-4.68-4.1-.14-.18-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29a1 1 0 0 1 .73-.34h.52c.17 0 .39-.06.61.47.23.55.78 1.9.85 2.04.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.18-.28.37-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.21.52.32.07.12.07.66-.17 1.34Z" />
          </svg>
          WhatsApp
        </a>
        <a
          href={SITE.phoneHref}
          data-analytics="call_click"
          tabIndex={scrolled ? undefined : -1}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[2px] border border-neutral-300 px-4 font-ui text-sm font-semibold uppercase tracking-[0.09em] text-charcoal"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-current">
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
          </svg>
          Call
        </a>
      </div>
    </div>
  );
}
