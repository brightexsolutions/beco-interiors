'use client';

import { useEffect } from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import 'sonner/dist/styles.css';
import { cn } from '../lib/cn';

/**
 * Replaces `window.alert`. Three tones, named in words so colour is not the
 * only signal: Done, Failed, Note. Server actions return `{ ok }` or
 * `{ error }`; the submitting component calls `toast` with that result.
 *
 * Headless Sonner: stack, swipe and timer stay, the card is ours.
 */

export type ToastTone = 'success' | 'error' | 'info';

const TONE: Record<
  ToastTone,
  { label: string; card: string; labelClass: string }
> = {
  success: {
    label: 'Done',
    card: 'border-success/30 bg-success/10',
    labelClass: 'text-success',
  },
  error: {
    label: 'Failed',
    card: 'border-error/30 bg-error/10',
    labelClass: 'text-error',
  },
  info: {
    label: 'Note',
    card: 'border-neutral-300 bg-neutral-50',
    labelClass: 'text-neutral-700',
  },
};

function ToastCard({
  id,
  tone,
  message,
}: {
  id: string | number;
  tone: ToastTone;
  message: string;
}) {
  const meta = TONE[tone];
  return (
    <div
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-label={`${meta.label}. ${message}`}
      className={cn(
        'flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3',
        'rounded-[2px] border px-4 py-3',
        'shadow-[0_12px_32px_rgba(16,24,32,0.14)]',
        meta.card,
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-ui text-sm font-semibold uppercase tracking-[0.12em]',
            meta.labelClass,
          )}
        >
          {meta.label}
        </p>
        <p className="mt-1 font-ui text-base text-charcoal">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => sonnerToast.dismiss(id)}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-500 hover:text-charcoal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-warm-red"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function show(tone: ToastTone, message: string) {
  return sonnerToast.custom((id) => <ToastCard id={id} tone={tone} message={message} />, {
    duration: tone === 'error' ? 8000 : 4000,
  });
}

export const toast = Object.assign((message: string) => show('info', message), {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
  dismiss: sonnerToast.dismiss,
});

/** Mount once, in the root layout. Top-right, so it never covers the FAB. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      visibleToasts={3}
      offset={16}
      mobileOffset={16}
      toastOptions={{ duration: 4000 }}
      containerAriaLabel="Notifications"
    />
  );
}

/**
 * Turns a server-action result into a toast. Empty initial state is silent.
 * Error wins if both are set.
 */
export function useActionToast(state: { error?: string; ok?: string }) {
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      return;
    }
    if (state.ok) toast.success(state.ok);
  }, [state]);
}
