'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, DialogBody, cn } from '@beco/ui';
import type { BottomNav as BottomNavModel, NavItem } from '@/lib/nav-items';
import { NavGlyph } from './nav-glyph';

/**
 * The phone's bottom navigation (D111). Fixed under the thumb, white, a hair
 * of border on top. The current screen is charcoal with a short tick above
 * its icon; the rest are quiet grey. New quote sits raised in the middle as
 * a charcoal tile, since raising a quote is the job the phone is for. More
 * opens the shared Dialog as a sheet with the remaining sections and the
 * account actions, and closes itself on navigation.
 *
 * The glyphs come from `NavGlyph`, shared with the desktop sidebar (D142),
 * because at 390px a word alone is not enough to find by thumb. Hidden
 * from `lg` up, where the sidebar is.
 */
const Glyph = NavGlyph;

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

function BarItem({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number | undefined;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 font-ui text-xs font-semibold leading-none transition-colors',
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
        data-tour="bottom-nav"
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-high-vis-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-16px_rgba(16,24,32,0.35)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl items-stretch">
          {slots.map((slot) => {
            if (slot.kind === 'new') {
              return (
                <li
                  key="new"
                  className="flex min-w-0 flex-1 flex-col items-center justify-end pb-1"
                >
                  <Link
                    href="/quotes/new"
                    aria-label="New quote"
                    className="-mt-5 flex h-12 w-12 items-center justify-center rounded-control bg-charcoal text-high-vis-white shadow-panel transition-colors hover:bg-neutral-700"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Link>
                  <span
                    aria-hidden
                    className="mt-1 font-ui text-xs font-semibold leading-none text-charcoal"
                  >
                    New quote
                  </span>
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
                      'relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 font-ui text-xs font-semibold leading-none transition-colors',
                      moreActive ? 'text-charcoal' : 'text-neutral-500 hover:text-charcoal',
                    )}
                  >
                    {moreActive ? (
                      <span aria-hidden className="absolute top-0 h-0.5 w-8 bg-charcoal" />
                    ) : null}
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
          <DialogBody>
            <ul className="grid grid-cols-2 gap-2">
              {nav.more.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 items-center gap-3 rounded-control border px-4 font-ui text-base font-semibold transition-colors',
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
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-control border border-neutral-200 px-4 font-ui text-base font-semibold text-charcoal hover:bg-neutral-100"
                >
                  Change password
                </Link>
                <form action="/sign-out" method="post" className="flex-1">
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-neutral-200 px-4 font-ui text-base font-semibold text-charcoal hover:bg-neutral-100"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </DialogBody>
        </Dialog>
      ) : null}
    </>
  );
}
