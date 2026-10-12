'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Icon, cn } from '@beco/ui';
import type { GuideTopic } from '@/lib/guide';
import type { NavItem } from '@/lib/nav-items';
import { NavGlyph } from './nav-glyph';

export interface PaletteCommand {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: 'section' | 'action' | 'search' | 'guide';
}

/**
 * What the palette can do for a person, from the sections they reach: go
 * to a section, start a new quote, search a list for what they typed, or
 * open a guide topic. Pure, so the ranking is unit tested.
 */
export function paletteCommands(
  query: string,
  items: NavItem[],
  topics: GuideTopic[],
  canRaiseQuotes: boolean,
): PaletteCommand[] {
  const q = query.trim().toLowerCase();
  const out: PaletteCommand[] = [];
  if (canRaiseQuotes && (!q || 'new quote'.includes(q) || 'raise a quote'.includes(q))) {
    out.push({ id: 'new-quote', label: 'New quote', hint: 'Raise one at the counter', href: '/quotes/new', kind: 'action' });
  }
  for (const item of items) {
    if (!q || item.label.toLowerCase().includes(q)) {
      out.push({ id: `go-${item.href}`, label: item.label, hint: 'Go to section', href: item.href, kind: 'section' });
    }
  }
  if (q) {
    const searchable: Array<[string, string]> = [
      ['/quotes', 'quotes'],
      ['/orders', 'orders'],
      ['/customers', 'customers'],
      ['/products', 'products'],
    ];
    for (const [href, noun] of searchable) {
      if (!items.some((item) => item.href === href)) continue;
      out.push({
        id: `search-${href}`,
        label: `Search ${noun} for "${query.trim()}"`,
        hint: `Opens the ${noun} list filtered`,
        href: `${href}?search=${encodeURIComponent(query.trim())}`,
        kind: 'search',
      });
    }
    for (const topic of topics) {
      const hay = `${topic.title} ${topic.purpose}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ id: `guide-${topic.id}`, label: topic.title, hint: 'Guide', href: `?guide=${topic.id}`, kind: 'guide' });
      }
    }
  }
  return out.slice(0, 12);
}

const KIND_GLYPH: Record<PaletteCommand['kind'], 'search' | 'help' | 'plus' | null> = {
  section: null,
  action: 'plus',
  search: 'search',
  guide: 'help',
};

/**
 * The ⌘K palette, D143: the search field in the sidebar and the shortcut
 * both open it. Typing narrows the sections, offers to search the lists
 * for the words, and finds guide topics. Enter takes the highlighted row.
 * A real control with a real destination for every row, not a decorative
 * search box.
 */
export function CommandPalette({
  items,
  topics,
  canRaiseQuotes,
  onOpenGuide,
}: {
  items: NavItem[];
  topics: GuideTopic[];
  canRaiseQuotes: boolean;
  /** Opens the guide on a topic, from a guide row. */
  onOpenGuide?: ((topicId: string) => void) | undefined;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = useMemo(() => paletteCommands(query, items, topics, canRaiseQuotes), [query, items, topics, canRaiseQuotes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((was) => !was);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const run = (command: PaletteCommand) => {
    setOpen(false);
    setQuery('');
    if (command.kind === 'guide') {
      onOpenGuide?.(command.id.replace(/^guide-/, ''));
      return;
    }
    router.push(command.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Search, command K"
        className="flex h-10 w-full items-center gap-2.5 rounded-control border border-neutral-200 bg-neutral-50 px-3 text-left font-ui text-sm text-neutral-500 transition-colors hover:border-neutral-300 hover:bg-high-vis-white"
      >
        <Icon name="search" className="h-4 w-4" />
        <span className="flex-1">Search</span>
        <kbd className="rounded-control border border-neutral-200 bg-high-vis-white px-1.5 py-0.5 font-ui text-xs text-neutral-500">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Search" initialFocusRef={inputRef} className="sm:h-auto sm:min-h-[22rem] sm:max-h-[min(80dvh,34rem)] sm:max-w-[36rem]">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-neutral-200 px-4 py-3 sm:px-5">
            <label htmlFor="palette-input" className="sr-only">
              Search sections, lists and the guide
            </label>
            <div className="flex h-11 items-center gap-2 rounded-control border border-neutral-200 bg-high-vis-white px-3 focus-within:border-charcoal">
              <Icon name="search" className="h-4 w-4 text-neutral-500" />
              <input
                ref={inputRef}
                id="palette-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActive((i) => Math.min(commands.length - 1, i + 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                  } else if (event.key === 'Enter' && commands[active]) {
                    event.preventDefault();
                    run(commands[active]);
                  }
                }}
                role="combobox"
                aria-controls="palette-results"
                aria-expanded="true"
                aria-activedescendant={commands[active] ? `palette-option-${active}` : undefined}
                aria-autocomplete="list"
                placeholder="A section, a customer, a product, a question"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-ui text-base text-charcoal outline-none placeholder:text-neutral-500"
              />
            </div>
          </div>
          <ul id="palette-results" role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto p-2">
            {commands.length === 0 ? (
              <li className="px-3 py-6 text-center font-ui text-sm text-neutral-500">Nothing matches. Try a section name or a customer.</li>
            ) : (
              commands.map((command, index) => {
                const glyph = KIND_GLYPH[command.kind];
                return (
                  <li
                    key={command.id}
                    id={`palette-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(command)}
                    className={cn(
                      'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-left font-ui text-base',
                      index === active ? 'bg-neutral-100 text-charcoal' : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-tint text-neutral-700">
                      {glyph ? <Icon name={glyph} className="h-4 w-4" /> : <NavGlyph href={command.href} className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{command.label}</span>
                      <span className="block truncate text-xs text-neutral-500">{command.hint}</span>
                    </span>
                    {index === active ? <kbd className="font-ui text-xs text-neutral-500">Enter</kbd> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Dialog>
    </>
  );
}
