'use client';

import { forwardRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Input, type InputProps } from './field';

/**
 * A password field with a show/hide toggle.
 *
 * A client island because the visibility is local state and nothing else
 * needs to know it. Wraps the shared `Input` so the field itself keeps every
 * token, border and focus ring the rest of the forms use; only the trailing
 * button is added.
 *
 * The toggle is `type="button"`, so it never submits the form, and its label
 * names the action it will perform ("Show password" while hidden), which is
 * how a screen reader user knows what pressing it does.
 */
export type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <span className="relative block">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-neutral-500 transition-colors hover:text-charcoal"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    );
  },
);

function EyeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path
        d="M10.6 10.6a3 3 0 0 0 4.24 4.24M9.5 5.2A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a15.7 15.7 0 0 1-3.4 4.05M6.2 6.2A15.6 15.6 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 4.3-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
