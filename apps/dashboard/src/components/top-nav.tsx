'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@beco/ui';
import type { NavItem } from '@/lib/nav-items';

/**
 * The section nav: a row of pills. The current section is a filled charcoal
 * pill, the rest are quiet text that take a light ground on hover. No icons.
 *
 * On a phone it is a horizontal scroll strip of the same pills rather than a
 * hamburger, so every section is one swipe away and the ones a role uses
 * most sit first.
 */
export function TopNav({ items, newQuotes = 0 }: { items: NavItem[]; newQuotes?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="relative">
      <ul className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-[2.5rem] items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-ui text-sm font-semibold transition-colors',
                  active
                    ? 'bg-charcoal text-high-vis-white'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-charcoal',
                )}
              >
                {item.label}
                {item.href === '/quotes' && newQuotes > 0 ? (
                  <span
                    className={cn(
                      'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-semibold leading-none',
                      active ? 'bg-high-vis-white text-charcoal' : 'bg-warm-red text-high-vis-white',
                    )}
                    aria-label={`${newQuotes} awaiting response`}
                  >
                    {newQuotes}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-high-vis-white to-transparent lg:hidden"
      />
    </nav>
  );
}
