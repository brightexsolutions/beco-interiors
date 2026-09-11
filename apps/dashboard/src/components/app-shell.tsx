import Link from 'next/link';
import type { ActiveSession } from '@/lib/session';
import { navItemsFor } from '@/lib/nav-items';
import { AccountMenu } from './account-menu';
import { TopNav } from './top-nav';

/**
 * The signed-in dashboard frame, per D85. An off-white ground with the chrome
 * and the content each on their own floating white panel. The nav is a row of
 * pills, the current section a filled charcoal one. Top nav, never a sidebar;
 * text, never icons. The one Warm Red in the chrome is the count on Quotes.
 *
 * `newQuotes` is 0 until the realtime nav count lands (M5 section L / M).
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
  const items = navItemsFor(user.role);
  const sections = items.filter((i) => i.href !== '/settings');
  const hasSettings = items.some((i) => i.href === '/settings');
  const name = user.fullName || user.email;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-[1440px] px-4 pt-4 lg:px-8 lg:pt-6">
        <header className="flex items-center gap-3 rounded-panel bg-high-vis-white p-2 shadow-panel lg:gap-5 lg:p-2.5">
          <Link
            href="/"
            aria-label="Beco Operations, home"
            className="ml-1 shrink-0 font-ui text-sm font-bold uppercase tracking-[0.3em] text-charcoal"
          >
            Beco
          </Link>

          <span aria-hidden className="h-6 w-px shrink-0 bg-neutral-200" />

          <div className="min-w-0 flex-1">
            <TopNav items={sections} newQuotes={newQuotes} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {hasSettings ? (
              <Link
                href="/settings"
                aria-label="Settings"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-charcoal sm:inline-flex"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-[1.15rem] w-[1.15rem]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H12a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V12a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
                </svg>
              </Link>
            ) : null}
            <AccountMenu name={name} />
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 py-4 lg:px-8 lg:py-6">
        <div className="rounded-panel bg-high-vis-white p-6 shadow-panel lg:p-9">{children}</div>
      </main>
    </div>
  );
}
