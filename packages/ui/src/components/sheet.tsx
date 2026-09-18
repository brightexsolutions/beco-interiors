'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

/**
 * A detail sheet for scanning tables (D38). Bottom sheet on a phone, right
 * rail on desktop. Plain elements, same as Dialog: escape, backdrop, focus
 * return, tab trap. No Radix, so it stays testable in jsdom.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Quiet status under the title: Draft, On the website. */
  description?: string | undefined;
  children: ReactNode;
  /** Sticky actions under the scrolling body, Save and Delete. */
  footer?: ReactNode | undefined;
  className?: string | undefined;
}

export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center lg:items-stretch lg:justify-end">
      <div aria-hidden onClick={close} className="absolute inset-0 bg-charcoal/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        aria-describedby={description ? 'sheet-description' : undefined}
        className={cn(
          'relative flex h-[min(92dvh,44rem)] w-full max-w-[36rem] flex-col overflow-hidden bg-high-vis-white',
          'rounded-t-[4px] lg:h-full lg:max-h-none lg:rounded-none lg:border-l lg:border-neutral-200',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-5 py-3">
          <div className="min-w-0">
            <h2 id="sheet-title" className="truncate font-ui text-base font-semibold text-charcoal">
              {title}
            </h2>
            {description ? (
              <p id="sheet-description" className="mt-1 font-ui text-base text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 font-ui text-sm font-semibold text-neutral-500 hover:text-charcoal"
          >
            <Icon name="x" />
            Close
          </button>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              'min-h-0 min-w-0 flex-1 overflow-x-hidden',
              footer ? 'overflow-y-auto px-5 py-5' : 'flex flex-col overflow-hidden',
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-neutral-200 px-5 py-3">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
