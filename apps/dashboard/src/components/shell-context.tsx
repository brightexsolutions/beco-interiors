'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navContext } from '@/lib/nav-items';

/**
 * The "you are here" bar. Hidden while the dashboard header is still on
 * screen. Once that header scrolls away it docks at the top, on a phone and
 * on desktop, so the page stays named. Nested screens link the section back
 * to the list.
 */
export function ShellContext() {
  const pathname = usePathname();
  const ctx = navContext(pathname);
  const [docked, setDocked] = useState(false);

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
      className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-high-vis-white shadow-panel"
    >
      <ol className="mx-auto flex min-h-11 max-w-[1440px] items-center gap-2 px-4 lg:px-8">
        {ctx.pageLabel ? (
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
              {ctx.pageLabel}
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
