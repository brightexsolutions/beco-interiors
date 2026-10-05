'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/**
 * The account control: a round initials button that opens a flat panel with
 * "Change password" and "Sign out". Closes on Escape, on a click outside, and
 * on navigation. Sign out is a POST, never a link, because a link would let a
 * prefetch or a crawler end someone's session.
 *
 * Stays a plain element (D88): Radix DropdownMenu cannot be clicked reliably
 * in jsdom, and this control already has tests proving it works.
 */
export function AccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account, ${name}`}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-ui text-sm font-semibold text-paper"
      >
        {initials(name)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-panel border border-neutral-200 bg-high-vis-white p-1.5"
        >
          <p className="px-2.5 pb-1.5 pt-1 font-ui text-xs text-neutral-500">{name}</p>
          <Link
            role="menuitem"
            href="/change-password"
            className="block rounded-control px-2.5 py-2 font-ui text-sm text-charcoal hover:bg-neutral-100"
          >
            Change password
          </Link>
          {/* A plain POST to the route handler, not a server action: see
              `app/sign-out/route.ts` for why the action could not survive its
              own redirect out of this layout. */}
          <form action="/sign-out" method="post">
            <button
              role="menuitem"
              type="submit"
              className="block w-full rounded-control px-2.5 py-2 text-left font-ui text-sm text-charcoal hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
