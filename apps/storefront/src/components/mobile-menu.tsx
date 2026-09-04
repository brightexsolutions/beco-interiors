'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@beco/ui';
import { isNavItemActive } from '@/lib/nav';
import { SITE, whatsappLink } from '@/lib/site';

/**
 * Navigation on a phone.
 *
 * Until this existed the main nav was `hidden md:block`, so on a phone there
 * was no way to reach Shop, Projects, About or Contact at all, and the only
 * route back to the home page was knowing the logo is a link. Mobile is most
 * of the traffic here, so that was the largest navigation gap on the site
 * rather than a polish item.
 *
 * Home is listed explicitly. The logo does the same job and always has, but
 * it is a convention rather than a signpost, and a panel that lists every
 * other destination while silently omitting this one is the panel's problem,
 * not the visitor's.
 *
 * Escape closes it and returns focus to the trigger, focus is trapped while
 * it is open, the page behind cannot scroll, and it closes on navigation.
 *
 * The panel covers the WHOLE viewport and carries its own close button. It
 * used to start at a fixed offset meant to clear the header, but the
 * announcement bar sits above the header and pushes it down, so the panel
 * covered the header and the only way out of it. A panel that owns the screen
 * has to own its own exit.
 */
const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/gallery', label: 'Projects' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About Beco' },
  { href: '/contact', label: 'Contact and showroom' },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Navigating closes it, so a link never leaves the panel covering the page
  // it just opened.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close the menu' : 'Open the menu'}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center text-charcoal"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="1.8">
          {open ? (
            <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-high-vis-white"
        >
          {/* The panel's own bar. Never relies on the header underneath being
              reachable, because it is not. */}
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
            <span className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Menu
            </span>
            <button
              type="button"
              onClick={() => { setOpen(false); trigger.current?.focus(); }}
              className="-mr-2 flex min-h-11 items-center gap-2 px-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-charcoal"
            >
              Close
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8">
                <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav aria-label="Main">
            <ul>
              {LINKS.map((link) => {
                // Shared with the desktop nav, per rule 5: a prefix match, so
                // Shop stays lit on /shop/handles rather than going dark the
                // moment a reader opens a category.
                const current = isNavItemActive(pathname, link.href);
                return (
                  <li key={link.href} className="border-b border-neutral-200">
                    <Link
                      href={link.href}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 items-center justify-between px-6 font-display text-2xl text-charcoal',
                        current && 'text-warm-red-deep',
                      )}
                    >
                      {link.label}
                      <span aria-hidden className="font-ui text-sm text-neutral-300">&rarr;</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto border-t border-neutral-200 p-6">
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Talk to us
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={SITE.phoneHref}
                data-analytics="call_click"
                className="flex min-h-11 items-center font-ui text-base font-semibold text-charcoal"
              >
                {SITE.phone}
              </a>
              <a
                href={whatsappLink()}
                data-analytics="whatsapp_click"
                className="flex min-h-11 items-center font-ui text-base font-semibold text-charcoal"
              >
                WhatsApp us
              </a>
              <address className="not-italic font-ui text-sm leading-[1.7] text-neutral-500">
                {SITE.address.line1}, {SITE.address.line2}, {SITE.address.city}
                <br />
                {SITE.hours}
              </address>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
