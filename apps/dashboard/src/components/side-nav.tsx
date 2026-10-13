'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Icon, cn } from '@beco/ui';
import type { NavGroup } from '@/lib/nav-items';
import { isActiveHref, openGroups, readStoredOpenGroups, storeOpenGroups } from '@/lib/side-nav-groups';
import { NavGlyph } from './nav-glyph';

/**
 * The desktop sidebar, D143: sections grouped by job, each row a glyph and
 * a word, 40px tall and rounded. The current section sits on the tint with
 * its glyph in Warm Red; the rest are quiet grey that darkens on hover.
 * The new quote count rides on Quotes as a red pill.
 *
 * Each group heading folds its rows away, D144, so the sidebar fits a laptop
 * screen without scrolling. Home and Sales start open, the group holding the
 * current screen always opens, and the reader's own choice is kept in this
 * browser.
 */
export function SideNav({ groups, newQuotes = 0 }: { groups: NavGroup[]; newQuotes?: number }) {
  const pathname = usePathname();
  const baseId = useId();
  // Defaults first so the server and the first client render agree; the
  // stored choice is read once mounted.
  const [open, setOpen] = useState(() => openGroups(groups, pathname, null));

  useEffect(() => {
    setOpen(openGroups(groups, pathname, readStoredOpenGroups()));
    // Mount only: later navigations are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A navigation opens the group it lands in, leaving the rest as they were.
  useEffect(() => {
    setOpen((current) => openGroups(groups, pathname, [...current]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = (label: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      storeOpenGroups(next);
      return next;
    });
  };

  return (
    <nav aria-label="Main" data-tour="nav" className="flex-1 overflow-y-auto px-3 py-1">
      {groups.map((group, index) => {
        const expanded = open.has(group.label);
        const listId = `${baseId}-group-${index}`;
        const foldedNew = !expanded && newQuotes > 0 && group.items.some((item) => item.href === '/quotes');
        return (
          <div key={group.label} className="py-1.5">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => toggle(group.label)}
              className="group flex min-h-9 w-full items-center gap-2 rounded-control px-3 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500 transition-colors hover:text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-charcoal"
            >
              <span>{group.label}</span>
              {foldedNew ? (
                <span
                  aria-label={`${newQuotes} new`}
                  className="inline-flex min-w-[1.375rem] items-center justify-center rounded-full bg-warm-red-deep px-1.5 font-ui text-xs font-semibold normal-case leading-5 tracking-normal text-high-vis-white"
                >
                  {newQuotes}
                </span>
              ) : null}
              <Icon
                name="chevron-down"
                className={cn('ml-auto h-4 w-4 transition-transform motion-reduce:transition-none', expanded ? '' : '-rotate-90')}
              />
            </button>
            <ul id={listId} hidden={!expanded} className="space-y-0.5 pt-0.5">
              {group.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
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
        );
      })}
    </nav>
  );
}
