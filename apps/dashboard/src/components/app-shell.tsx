import Link from 'next/link';
import type { ActiveSession } from '@/lib/session';
import { bottomNavFor, navGroupsFor, navItemsFor } from '@/lib/nav-items';
import { AccountMenu } from './account-menu';
import { BottomNav } from './bottom-nav';
import { ShellContext, ShellPageLabelProvider, TopBarCrumb } from './shell-context';
import { SideNav } from './side-nav';
import { ThemeToggle } from './theme-toggle';

/**
 * The signed-in dashboard frame, D106.
 *
 * Desktop: a white sidebar holding the mark and the sections grouped by
 * job, a slim top bar naming where the reader is, and the screen on a
 * floating white panel over an off-white ground. Phone: the floating header
 * card names where the reader is, and the sections live in a bottom bar
 * under the thumb (D111), with New quote raised in its middle and the rest
 * behind More. `--dock` is the bar's height, so the docked save bars and
 * the floating actions sit above it rather than under it.
 *
 * Charcoal carries the brand; Warm Red appears as the tick on the current
 * section and the count on Quotes. The licensed showroom still sits behind
 * the phone header under a charcoal wash, so the top of the screen reads
 * as Beco's rather than as a generic admin.
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
  const grants = { canWriteBlog: user.canWriteBlog, canReadAudit: user.canReadAudit };
  const items = navItemsFor(user.role, grants);
  const groups = navGroupsFor(user.role, grants);
  const bottom = bottomNavFor(user.role, grants);
  const hasSettings = items.some((i) => i.href === '/settings');
  const name = user.fullName || user.email;

  return (
    <ShellPageLabelProvider>
      <div
        className={
          bottom.items.length > 0
            ? 'min-h-screen bg-neutral-50 [--dock:calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:[--dock:0px]'
            : 'min-h-screen bg-neutral-50 [--dock:0px] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]'
        }
      >
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-neutral-200 bg-high-vis-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <Link
            href="/"
            aria-label="Beco Operations, home"
            className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4"
          >
            <img src="/logo-mark.png" alt="" width={36} height={35} className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block font-ui text-sm font-bold uppercase tracking-[0.3em] text-charcoal">Beco</span>
              <span className="block font-ui text-xs text-neutral-500">Operations</span>
            </span>
          </Link>
          <SideNav groups={groups} newQuotes={newQuotes} />
          <div className="border-t border-neutral-200 px-5 py-3">
            <p className="truncate font-ui text-sm font-semibold text-charcoal">{name}</p>
            <p className="truncate font-ui text-xs text-neutral-500">{user.email}</p>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phone header, the D85 card over the showroom still */}
          <div className="relative lg:hidden">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden bg-ink">
              <img
                src="/video/gallery-ambient-poster.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/90" />
            </div>
            <div className="relative mx-auto max-w-[1440px] px-4 pt-4">
              <header
                data-shell-header
                className="flex items-center gap-3 rounded-panel bg-high-vis-white p-2 shadow-panel"
              >
                <Link
                  href="/"
                  aria-label="Beco Operations, home"
                  className="ml-1 inline-flex shrink-0 items-center gap-2.5 font-ui text-sm font-bold uppercase tracking-[0.3em] text-charcoal"
                >
                  <img src="/logo-mark.png" alt="" width={32} height={31} className="h-8 w-8 shrink-0" />
                  <span className="hidden sm:inline">Beco</span>
                </Link>
                <span aria-hidden className="h-6 w-px shrink-0 bg-neutral-200" />
                <div className="min-w-0 flex-1 px-1">
                  <TopBarCrumb />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <ThemeToggle />
                  <AccountMenu name={name} />
                </div>
              </header>
            </div>
          </div>

          {/* Desktop top bar */}
          <div className="hidden items-center justify-between gap-4 border-b border-neutral-200 bg-high-vis-white/80 px-8 py-3 backdrop-blur lg:flex">
            <TopBarCrumb />
            <div className="flex shrink-0 items-center gap-1.5">
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
            </div>
          </div>

          <ShellContext />

          <main className="relative mx-auto max-w-[1440px] px-4 py-4 pb-[calc(var(--dock)+1rem)] lg:px-8 lg:py-8">
            <div className="rounded-panel bg-high-vis-white p-6 shadow-panel lg:p-9">{children}</div>
          </main>
        </div>
        <BottomNav nav={bottom} newQuotes={newQuotes} name={name} />
      </div>
    </ShellPageLabelProvider>
  );
}
