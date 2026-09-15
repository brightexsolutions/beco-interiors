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
 *
 * `light`, added for D79: the transparent-over-hero header now sits above a
 * full bleed dark photograph rather than the page's own light background,
 * so the same dark `text-neutral-700` that read fine over white is nearly
 * invisible over it. `light` is only ever true on `/`, the one route that
 * can be `overHero`, and no nav item is ever the active page there, so the
 * active and light states never have to be resolved against each other.
 */
export function NavLink({
  href, children, light = false,
}: {
  href: string;
  children: ReactNode;
  light?: boolean;
}) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] transition-colors',
        active && 'text-warm-red-deep',
        !active && light && 'text-neutral-200 hover:text-high-vis-white',
        !active && !light && 'text-neutral-700 hover:text-warm-red-deep',
      )}
    >
      {children}
    </Link>
  );
}
