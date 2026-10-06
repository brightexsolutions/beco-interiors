'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@beco/ui';
import type { NavGroup } from '@/lib/nav-items';

/**
 * The desktop sidebar: sections grouped by job, the current one filled
 * charcoal with a short Warm Red tick at its edge, the rest quiet text. The
 * new quote count rides on Quotes. Text, not icons: every label is a word a
 * salesperson already uses.
 */
export function SideNav({ groups, newQuotes = 0 }: { groups: NavGroup[]; newQuotes?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
      {groups.map((group) => (
        <div key={group.label} className="py-3">
          <p className="px-3 pb-1.5 font-ui text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex min-h-10 items-center justify-between gap-2 rounded-card px-3 font-ui text-base transition-colors',
                      active
                        ? 'bg-charcoal font-semibold text-high-vis-white'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-charcoal',
                    )}
                  >
                    {active ? <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-warm-red" /> : null}
                    <span className="truncate">{item.label}</span>
                    {item.href === '/quotes' && newQuotes > 0 ? (
                      <span
                        aria-label={`${newQuotes} new`}
                        className={cn(
                          'inline-flex min-w-[1.375rem] items-center justify-center rounded-full px-1.5 font-ui text-xs font-semibold leading-5',
                          active ? 'bg-high-vis-white text-charcoal' : 'bg-warm-red text-high-vis-white',
                        )}
                      >
                        {newQuotes}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
