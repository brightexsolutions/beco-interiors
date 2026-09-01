'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@beco/ui';

/**
 * A navigation dropdown.
 *
 * Opens on hover for a pointer and on click or Enter for everything else,
 * which matters because hover alone is unreachable by keyboard and unusable on
 * a touch screen. The trigger is a real button carrying `aria-expanded`, not a
 * link that goes nowhere.
 *
 * Escape closes it and returns focus to the trigger, the arrow keys walk the
 * items, and a click anywhere outside dismisses it. Those four behaviours are
 * what separates a menu from a div that appears on hover.
 *
 * The trigger's own destination is kept as the first item rather than making
 * the trigger both a link and a toggle, which is ambiguous for everyone: a
 * mouse user cannot tell whether clicking navigates, and a screen reader is
 * told it is two things at once.
 */
export interface NavItem {
  href: string;
  label: string;
  description?: string;
}

export function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const links = Array.from(
        root.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? [],
      );
      if (links.length === 0) return;
      event.preventDefault();
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        event.key === 'ArrowDown'
          ? links[(at + 1) % links.length]
          : links[(at - 1 + links.length) % links.length];
      next?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // A short grace period, so crossing the gap between trigger and panel does
  // not close the menu under the pointer.
  const openNow = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 px-4 py-2 font-ui text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700 transition-colors hover:text-warm-red-deep"
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 8"
          className={cn(
            'h-2 w-3 fill-none stroke-current transition-transform duration-300 ease-brand',
            open && 'rotate-180',
          )}
          strokeWidth="1.75"
        >
          <path d="M1 1.5 6 6.5l5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute left-0 top-full z-50 w-[19rem] border border-neutral-200 bg-high-vis-white pt-1 shadow-[0_20px_50px_rgba(16,24,32,0.14)]"
        >
          {/* A red hairline across the top, the same eyebrow mark the sections
              use, so the menu belongs to the site rather than to a framework. */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-warm-red" />
          <ul className="py-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-5 py-3 transition-colors hover:bg-neutral-50"
                >
                  <span className="font-ui text-sm font-semibold uppercase tracking-[0.12em] text-charcoal">
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-1 block font-ui text-sm normal-case tracking-normal text-neutral-500">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
