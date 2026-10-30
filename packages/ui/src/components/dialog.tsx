'use client';

import { useCallback, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { useModalFocus } from '../lib/use-modal-focus';
import { useScrollLock } from '../lib/use-scroll-lock';
import { useVisualViewport } from '../lib/use-visual-viewport';

/**
 * A branded modal. Same rules as ConfirmDialog: no <dialog>, no browser
 * chrome, escape and backdrop close, focus returns to the opener, tab stays
 * inside. ConfirmDialog is the destructive special case. This is everything
 * else, including a PDF preview.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Extra classes on the panel, for a wide preview. */
  className?: string | undefined;
  /** Lands focus on open. Close is the default, search for a picker. */
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
  initialFocusRef,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  useScrollLock(open, panelRef);
  const viewport = useVisualViewport();
  // On a phone the sheet is pinned to the bottom of the layout viewport,
  // which iOS leaves behind the keyboard. While a keyboard is open, pin the
  // overlay to the visible area instead, so the footer action stays above
  // the keys rather than under them.
  const fitToKeyboard = viewport?.keyboardOpen
    ? { top: viewport.offsetTop, height: viewport.height, bottom: 'auto' }
    : undefined;

  useModalFocus(open, panelRef, close, initialFocusRef, closeRef);

  if (!open) return null;

  // Portalled to the body: a sticky sidebar or a positioned main would
  // otherwise paint over the overlay, since each makes its own stacking
  // context and z-index cannot escape one.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex overscroll-none items-end justify-center sm:items-center sm:p-6"
      style={fitToKeyboard}
      data-keyboard-open={viewport?.keyboardOpen ? 'true' : undefined}
    >
      <div aria-hidden onClick={close} className="absolute inset-0 bg-ink/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={fitToKeyboard ? { height: '100%', maxHeight: '100%' } : undefined}
        className={cn(
          'relative flex h-[min(100dvh,56rem)] w-full max-w-[34rem] flex-col overflow-hidden bg-high-vis-white shadow-[0_24px_60px_-16px_rgba(16,24,32,0.28)] sm:h-[min(92dvh,56rem)] sm:max-h-[min(92dvh,56rem)] sm:rounded-card',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-5 py-3 sm:px-6">
          <h2
            id="dialog-title"
            className="min-w-0 truncate font-ui text-base font-semibold text-charcoal"
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center font-ui text-sm font-semibold text-neutral-500 hover:text-charcoal"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The padded, scrolling content of a Dialog. Dialog's own body is a bare
 * column so a PDF preview or the command palette can fill it edge to edge;
 * anything that is text, a list or a form goes in this, so it sits off the
 * edges and scrolls under the title rather than being cut off.
 */
export function DialogBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', className)}>
      {children}
    </div>
  );
}

/**
 * A Dialog's actions, pinned under its body with a rule above, the same
 * frame as a Sheet's footer: anything to the left (a status, a secondary
 * action) on the left, Cancel and the verb on the right. On a phone the
 * verb stacks first, nearest the thumb.
 */
export function DialogFooter({
  children,
  start,
  className,
}: {
  children: ReactNode;
  start?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-neutral-200 bg-high-vis-white px-5 py-3 sm:flex-row sm:items-center sm:px-6',
        className,
      )}
    >
      {start ? <div className="min-w-0 sm:mr-auto">{start}</div> : null}
      <div
        className={cn(
          'flex flex-col-reverse gap-2 sm:flex-row sm:items-center',
          !start && 'sm:ml-auto',
        )}
      >
        {children}
      </div>
    </div>
  );
}
