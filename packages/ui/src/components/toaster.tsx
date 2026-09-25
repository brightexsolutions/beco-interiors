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
 * Headless Sonner: stack, swipe and timer stay. The card is the same
 * floating white panel as the dashboard chrome, opaque, so a tinted fill
 * cannot photograph through the charcoal band.
 */

export type ToastTone = 'success' | 'error' | 'info';

const TONE: Record<ToastTone, { label: string; labelClass: string }> = {
  success: { label: 'Done', labelClass: 'text-success' },
  error: { label: 'Failed', labelClass: 'text-error' },
  info: { label: 'Note', labelClass: 'text-charcoal' },
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
      className="flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-panel border border-neutral-200 bg-high-vis-white px-4 py-3 shadow-panel"
    >
      <div className="min-w-0 flex-1">
        <p className={cn('font-ui text-base font-semibold', meta.labelClass)}>{meta.label}</p>
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
    id: `${tone}:${message}`,
    duration: tone === 'error' ? 8000 : 4000,
    unstyled: true,
  });
}

export const toast = Object.assign((message: string) => show('info', message), {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
  dismiss: sonnerToast.dismiss,
});

type ToastPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

type ToastOffset =
  | number
  | string
  | {
      top?: string | number;
      right?: string | number;
      bottom?: string | number;
      left?: string | number;
    };

/**
 * Mount once, in the root layout. The dashboard passes a placement that
 * sits on the white content panel, below the chrome, never on the charcoal
 * band and never over the FAB.
 */
export function Toaster({
  position = 'top-right',
  offset = 16,
  mobileOffset,
}: {
  position?: ToastPosition;
  offset?: ToastOffset;
  mobileOffset?: ToastOffset;
} = {}) {
  return (
    <SonnerToaster
      position={position}
      visibleToasts={3}
      offset={offset}
      mobileOffset={mobileOffset ?? offset}
      toastOptions={{
        unstyled: true,
        duration: 4000,
        classNames: {
          toast: 'border-0 bg-transparent p-0 shadow-none',
        },
      }}
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
  }, [state.error, state.ok]);
}
