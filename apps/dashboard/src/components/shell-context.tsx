'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navContext } from '@/lib/nav-items';

const PageLabelContext = createContext<{
  override: string | null;
  setOverride: (label: string | null) => void;
}>({ override: null, setOverride: () => {} });

export function ShellPageLabelProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<string | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <PageLabelContext.Provider value={value}>{children}</PageLabelContext.Provider>;
}

/** Sets the docked breadcrumb to a human name instead of the URL id. */
export function ShellPageLabel({ label }: { label: string }) {
  const { setOverride } = useContext(PageLabelContext);
  useEffect(() => {
    setOverride(label);
    return () => setOverride(null);
  }, [label, setOverride]);
  return null;
}

/** Where the reader is, for the desktop top bar: section, then page. */
export function TopBarCrumb() {
  const pathname = usePathname();
  const ctx = navContext(pathname);
  const { override } = useContext(PageLabelContext);
  if (!ctx) return null;
  const pageLabel = override ?? ctx.pageLabel ?? null;
  return (
    <ol aria-label="You are here" className="flex min-w-0 items-center gap-2 font-ui text-base">
      {pageLabel ? (
        <>
          {/* On a phone the header has room for one name, and the screen's own
              back link already names the section (D113). */}
          <li className="hidden shrink-0 sm:block">
            <Link href={ctx.sectionHref} className="text-neutral-500 hover:text-charcoal">
              {ctx.sectionLabel}
            </Link>
          </li>
          <li aria-hidden className="hidden text-neutral-300 sm:block">/</li>
          <li aria-current="page" className="min-w-0 truncate font-semibold text-charcoal">{pageLabel}</li>
        </>
      ) : (
        <li aria-current="page" className="min-w-0 truncate font-semibold text-charcoal">{ctx.sectionLabel}</li>
      )}
    </ol>
  );
}

/**
 * The "you are here" bar on a phone. Hidden while the dashboard header is
 * still on screen. Once that header scrolls away it docks at the top so the
 * page stays named. Nested screens link the section back to the list. On
 * desktop the sidebar and the top bar carry this, so it is not drawn there.
 */
export function ShellContext() {
  const pathname = usePathname();
  const ctx = navContext(pathname);
  const { override } = useContext(PageLabelContext);
  const [docked, setDocked] = useState(false);
  const pageLabel = override ?? ctx?.pageLabel ?? null;

  useEffect(() => {
    const header = document.querySelector('[data-shell-header]');
    if (!header || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setDocked(!entry?.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, [pathname]);

  if (!ctx || !docked) return null;

  return (
    <nav
      aria-label="You are here"
      className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-high-vis-white shadow-panel lg:hidden"
    >
      <ol className="mx-auto flex min-h-11 max-w-[1440px] items-center gap-2 px-4 lg:px-8">
        {pageLabel ? (
          <>
            <li className="shrink-0">
              <Link
                href={ctx.sectionHref}
                className="font-ui text-base text-neutral-500 hover:text-charcoal"
              >
                {ctx.sectionLabel}
              </Link>
            </li>
            <li aria-hidden className="text-neutral-300">
              /
            </li>
            <li
              aria-current="page"
              className="min-w-0 truncate font-ui text-base font-semibold text-charcoal"
            >
              {pageLabel}
            </li>
          </>
        ) : (
          <li aria-current="page" className="min-w-0 truncate font-ui text-base font-semibold text-charcoal">
            {ctx.sectionLabel}
          </li>
        )}
      </ol>
    </nav>
  );
}
