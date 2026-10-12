import Link from 'next/link';
import { Suspense } from 'react';
import { Icon, buttonClasses, cn } from '@beco/ui';
import { ROUTE_RULES, accessLevel, canAccess, grantsFrom } from '@/lib/access';
import { guideTopicsFor } from '@/lib/guide';
import type { ActiveSession } from '@/lib/session';
import { bottomNavFor, navGroupsFor, navItemsFor } from '@/lib/nav-items';
import { AccountMenu } from './account-menu';
import { BottomNav } from './bottom-nav';
import { CommandPalette } from './command-palette';
import { ConnectionStatus } from './connection-status';
import { GuideButton } from './guide';
import { RouteProgress } from './route-progress';
import { ShellContext, ShellPageLabelProvider, TopBarCrumb } from './shell-context';
import { SideNav } from './side-nav';
import { ThemeToggle } from './theme-toggle';
import { ViewOnlyMark } from './view-only-mark';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/**
 * The signed-in dashboard frame, D143.
 *
 * Desktop: a white sidebar with the red mark, the ⌘K search, the sections
 * grouped by job as glyph and word, and the signed-in person at the foot; a
 * 64px top bar naming where the reader is, with the guide, the new quote
 * count, appearance, settings and the account; the screen's own cards on a
 * cool grey ground. Phone: the header card over the showroom still (D85)
 * naming the screen, and the sections in a bottom bar under the thumb
 * (D111). `--dock` is the bar's height, so docked save bars and floating
 * actions sit above it.
 *
 * `newQuotes` is read on each server render of the layout.
 */
export function AppShell({
  user,
  newQuotes = 0,
  children,
}: {
  user: ActiveSession;
  newQuotes?: number;
  children: React.ReactNode;
}) {
  const grants = grantsFrom(user);
  const items = navItemsFor(user.role, grants);
  const groups = navGroupsFor(user.role, grants);
  const bottom = bottomNavFor(user.role, grants);
  const hasSettings = items.some((i) => i.href === '/settings');
  const raisesQuotes = canAccess(user.role, '/quotes/new', grants) && accessLevel(user.role, '/quotes', grants) === 'full';
  const readOnlyPrefixes = ROUTE_RULES.filter((rule) => accessLevel(user.role, rule.prefix, grants) === 'read').map(
    (rule) => rule.prefix,
  );
  const name = user.fullName || user.email;
  const guide = guideTopicsFor(user.role, grants, '/');

  return (
    <ShellPageLabelProvider>
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <ConnectionStatus />
      <div
        className={
          bottom.items.length > 0
            ? 'min-h-screen bg-neutral-50 [--dock:calc(3.5625rem+env(safe-area-inset-bottom,0px))] [--shell-top:0px] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:[--dock:0px] lg:[--shell-top:4rem]'
            : 'min-h-screen bg-neutral-50 [--dock:0px] [--shell-top:0px] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:[--shell-top:4rem]'
        }
      >
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-neutral-200 bg-high-vis-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="px-4 pt-5 pb-3">
            <Link href="/" aria-label="Beco Operations, home" className="flex min-h-11 items-center gap-3 rounded-control px-1">
              <img src="/logo-mark.png" alt="" width={36} height={35} className="h-9 w-9 shrink-0" />
              <span className="min-w-0">
                <span className="block font-ui text-sm font-bold uppercase tracking-[0.18em] text-charcoal">Beco</span>
                <span className="-mt-0.5 block font-ui text-xs text-neutral-500">Operations</span>
              </span>
            </Link>
            <div data-tour="search" className="mt-4">
              <CommandPalette items={items} topics={guide} canRaiseQuotes={raisesQuotes} />
            </div>
          </div>
          <SideNav groups={groups} newQuotes={newQuotes} />
          <div className="mt-auto border-t border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-charcoal font-ui text-xs font-bold text-high-vis-white">
                {initials(name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-ui text-sm font-semibold text-charcoal">{name}</span>
                <span className="block truncate font-ui text-xs text-neutral-500">{user.email}</span>
              </span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phone header, the D85 card over the showroom still */}
          <div className="relative lg:hidden">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden bg-ink">
              <img
                src="/video/gallery-ambient-poster.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/65 via-60% to-neutral-50" />
            </div>
            <div className="relative mx-auto max-w-[1440px] px-4 pt-4">
              <header
                data-shell-header
                className="flex items-center gap-2 rounded-panel bg-high-vis-white p-2 shadow-panel"
              >
                <Link
                  href="/"
                  aria-label="Beco Operations, home"
                  className="ml-1 inline-flex min-h-11 shrink-0 items-center gap-2.5 font-ui text-sm font-bold uppercase tracking-[0.18em] text-charcoal"
                >
                  <img src="/logo-mark.png" alt="" width={32} height={31} className="h-8 w-8 shrink-0" />
                  <span className="hidden sm:inline">Beco</span>
                </Link>
                <span aria-hidden className="h-6 w-px shrink-0 bg-neutral-200" />
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                  <TopBarCrumb />
                  <ViewOnlyMark readOnlyPrefixes={readOnlyPrefixes} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <GuideButton topics={guide} compact />
                  <ThemeToggle />
                  <AccountMenu name={name} />
                </div>
              </header>
            </div>
          </div>

          {/* Desktop top bar */}
          {/* z-20: backdrop-blur makes this bar its own stacking context, so
              without a z-index of its own the main panel below painted over
              it and hid the account menu that opens from it. Sticky, D146:
              it stays in view while the page scrolls, and its height is
              --shell-top, which anything else pinned to the top sits under. */}
          <div data-top-bar className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-neutral-200 bg-high-vis-white/85 px-8 backdrop-blur lg:flex">
            <div className="flex min-w-0 items-center gap-3">
              <TopBarCrumb />
              <ViewOnlyMark readOnlyPrefixes={readOnlyPrefixes} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <GuideButton topics={guide} />
              {canAccess(user.role, '/quotes', grants) ? (
                <Link
                  href="/quotes?owner=all&status=new"
                  aria-label={newQuotes > 0 ? `${newQuotes} new quotes` : 'New quotes'}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-charcoal"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />
                  </svg>
                  {newQuotes > 0 ? (
                    <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warm-red ring-2 ring-high-vis-white" />
                  ) : null}
                </Link>
              ) : null}
              <ThemeToggle />
              {hasSettings ? (
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-charcoal"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="12" cy="12" r="3.2" />
                    <path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H12a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V12a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
                  </svg>
                </Link>
              ) : null}
              <AccountMenu name={name} />
              {raisesQuotes ? (
                <Link href="/quotes/new" data-tour="new-quote" className={cn(buttonClasses({ variant: 'primary' }), 'ml-2 h-10 gap-2')}>
                  <Icon name="plus" />
                  New quote
                </Link>
              ) : null}
            </div>
          </div>

          <ShellContext />

          <main className="relative mx-auto w-full max-w-[1320px] px-4 py-5 pb-[calc(var(--dock)+1.25rem)] lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
        <BottomNav nav={bottom} newQuotes={newQuotes} name={name} />
      </div>
    </ShellPageLabelProvider>
  );
}
