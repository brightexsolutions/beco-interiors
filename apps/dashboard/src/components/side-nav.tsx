'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@beco/ui';
import type { NavGroup } from '@/lib/nav-items';
import { NavGlyph } from './nav-glyph';

/**
 * The desktop sidebar, D143: sections grouped by job, each row a glyph and
 * a word, 40px tall and rounded. The current section sits on the tint with
 * its glyph in Warm Red; the rest are quiet grey that darkens on hover.
 * The new quote count rides on Quotes as a red pill.
 */
export function SideNav({ groups, newQuotes = 0 }: { groups: NavGroup[]; newQuotes?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-1">
      {groups.map((group) => (
        <div key={group.label} className="py-2.5">
          <p className="px-3 pb-1.5 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex min-h-10 items-center gap-3 rounded-control px-3 font-ui text-base transition-colors',
                      active
                        ? 'bg-neutral-100 font-semibold text-charcoal'
                        : 'font-medium text-neutral-700 hover:bg-neutral-50 hover:text-charcoal',
                    )}
                  >
                    <NavGlyph
                      href={item.href}
                      className={cn('h-[18px] w-[18px]', active ? 'text-warm-red-deep' : 'text-neutral-500 group-hover:text-charcoal')}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.href === '/quotes' && newQuotes > 0 ? (
                      <span
                        aria-label={`${newQuotes} new`}
                        className="ml-auto inline-flex min-w-[1.375rem] items-center justify-center rounded-full bg-warm-red-deep px-1.5 font-ui text-xs font-semibold leading-5 text-high-vis-white"
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
