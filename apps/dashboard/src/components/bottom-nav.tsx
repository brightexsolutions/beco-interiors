'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, cn } from '@beco/ui';
import type { BottomNav as BottomNavModel, NavItem } from '@/lib/nav-items';

/**
 * The phone's bottom navigation (D111). Fixed under the thumb, white, a hair
 * of border on top. The current screen is charcoal with a short tick above
 * its icon; the rest are quiet grey. New quote sits raised in the middle as
 * a charcoal tile, since raising a quote is the job the phone is for. More
 * opens the shared Dialog as a sheet with the remaining sections and the
 * account actions, and closes itself on navigation.
 *
 * Icons are drawn here, one per section, because at 390px a word alone is
 * not enough to find by thumb and the desktop sidebar, which is text only,
 * does not have to share them. Hidden from `lg` up, where the sidebar is.
 */
const ICONS: Record<string, string> = {
  '/': 'M3 11.5 12 4l9 7.5M5.5 10v9h13v-9',
  '/quotes': 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 16h5',
  '/orders': 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  '/customers': 'M4 5h16v14H4zM9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 17a3.5 3.5 0 0 1 7 0M14.5 9.5h3.5M14.5 13h3.5',
  '/products': 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  '/products/import': 'M12 4v11m0 0 4-4m-4 4-4-4M5 19h14',
  '/announcements': 'M4 10v4h3l6 4V6l-6 4zM16 9.5a3.5 3.5 0 0 1 0 5',
  '/reports': 'M5 19V11M10 19V5M15 19v-7M20 19V9',
  '/users': 'M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0 0-6M21.5 20a5 5 0 0 0-5-5',
  '/settings': 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  '/studio/blog': 'M5 19h14M7 15l9.5-9.5a1.5 1.5 0 0 1 2 2L9 17l-3 1z',
  '/audit': 'M6 4h12v16H6zM9 9h6M9 13h6M9 17h3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

function Glyph({ href, className }: { href: string; className?: string }) {
  const d = ICONS[href] ?? ICONS.more!;
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn('h-6 w-6', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={href === 'more' ? 2.6 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

function BarItem({ item, active, badge }: { item: NavItem; active: boolean; badge?: number | undefined }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 font-ui text-sm font-semibold leading-none transition-colors',
        active ? 'text-charcoal' : 'text-neutral-500 hover:text-charcoal',
      )}
    >
      {active ? <span aria-hidden className="absolute top-0 h-0.5 w-8 bg-charcoal" /> : null}
      <span className="relative">
        <Glyph href={item.href} />
        {badge && badge > 0 ? (
          <span
            aria-label={`${badge} new`}
            className="absolute -right-2.5 -top-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-warm-red px-1 text-xs font-semibold leading-5 text-high-vis-white"
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

export function BottomNav({
  nav,
  newQuotes = 0,
  name,
}: {
  nav: BottomNavModel;
  newQuotes?: number;
  /** The signed-in name, for the sheet's account block. */
  name: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // A tap in the sheet navigates; the sheet must not still be there on the
  // next screen.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (nav.items.length === 0) return null;
  const moreActive = nav.more.some((item) => isActive(pathname, item.href));

  // The bar's slots in order: the items, with New quote raised in the middle
  // when the role raises quotes, then More when there is more.
  type Slot = { kind: 'item'; item: NavItem } | { kind: 'new' } | { kind: 'more' };
  const slots: Slot[] = nav.items.map((item) => ({ kind: 'item', item }));
  if (nav.newQuote) slots.splice(Math.ceil(nav.items.length / 2), 0, { kind: 'new' });
  if (nav.more.length > 0) slots.push({ kind: 'more' });

  return (
    <>
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-high-vis-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-16px_rgba(16,24,32,0.35)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl items-stretch">
          {slots.map((slot) => {
            if (slot.kind === 'new') {
              return (
                <li key="new" className="flex min-w-0 flex-1 flex-col items-center justify-end pb-1">
                  <Link
                    href="/quotes/new"
                    aria-label="New quote"
                    className="-mt-5 flex h-12 w-12 items-center justify-center rounded-[10px] bg-charcoal text-high-vis-white shadow-panel transition-colors hover:bg-neutral-700"
                  >
                    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                  <span aria-hidden className="mt-1 font-ui text-sm font-semibold leading-none text-charcoal">New quote</span>
                </li>
              );
            }
            if (slot.kind === 'more') {
              return (
                <li key="more" className="flex min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={moreOpen}
                    className={cn(
                      'relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 font-ui text-sm font-semibold leading-none transition-colors',
                      moreActive ? 'text-charcoal' : 'text-neutral-500 hover:text-charcoal',
                    )}
                  >
                    {moreActive ? <span aria-hidden className="absolute top-0 h-0.5 w-8 bg-charcoal" /> : null}
                    <Glyph href="more" />
                    <span>More</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={slot.item.href} className="flex min-w-0 flex-1">
                <BarItem
                  item={slot.item}
                  active={isActive(pathname, slot.item.href)}
                  badge={slot.item.href === '/quotes' ? newQuotes : undefined}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {nav.more.length > 0 ? (
        <Dialog open={moreOpen} onOpenChange={setMoreOpen} title="More">
          <ul className="grid grid-cols-2 gap-2">
            {nav.more.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-14 items-center gap-3 rounded-[10px] border px-4 font-ui text-base font-semibold transition-colors',
                      active
                        ? 'border-charcoal bg-charcoal text-high-vis-white'
                        : 'border-neutral-200 text-charcoal hover:bg-neutral-100',
                    )}
                  >
                    <Glyph href={item.href} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 border-t border-neutral-200 pt-4">
            <p className="truncate font-ui text-sm text-neutral-500">Signed in as {name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Link
                href="/change-password"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border border-neutral-200 px-4 font-ui text-base font-semibold text-charcoal hover:bg-neutral-100"
              >
                Change password
              </Link>
              <form action="/sign-out" method="post" className="flex-1">
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-neutral-200 px-4 font-ui text-base font-semibold text-charcoal hover:bg-neutral-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
