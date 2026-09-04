'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@beco/ui';
import { isNavItemActive } from '@/lib/nav';

/**
 * A top level nav link that knows whether it is the page you are already on.
 *
 * Every desktop nav item shared the same hover-only styling with no current
 * page indication at all: `usePathname` was already read in `SiteHeader` for
 * the transparent-over-hero check, but never compared against a link's own
 * href. The active item now carries the site's Warm Red, the same token
 * hover already used, so "you are here" and "this is clickable" read as one
 * colour rather than two.
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] transition-colors',
        active ? 'text-warm-red-deep' : 'text-neutral-700 hover:text-warm-red-deep',
      )}
    >
      {children}
    </Link>
  );
}
