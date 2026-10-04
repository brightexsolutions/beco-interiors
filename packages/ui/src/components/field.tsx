import { forwardRef } from 'react';
import { cn } from '../lib/cn';

/**
 * Form primitives, in one place.
 *
 * These were written twice: once inside the quote form and once inside the
 * shop's filter bar, each with its own label size, its own border colour and
 * its own focus ring. Rule 5 says a pattern that appears twice belongs here,
 * and a form control is the worst thing to let drift, because the difference
 * shows up as a field that looks disabled on one page and not on another.
 *
 * `Field` owns the label, the hint and the error. The control is passed in, so
 * the same wrapper serves an input, a select, a textarea or a group of radios
 * without needing a variant for each.
 *
 * Deliberately not a client component. None of this holds state: the quote
 * form is uncontrolled and reads values from the FormData on submit, and the
 * shop's controls own their own state. Making these client components would
 * pull every form that uses them into the bundle for no benefit.
 */

/** 16px, per the type floor. `text-base`, never `text-sm`, on any control. */
const CONTROL = [
  'block w-full rounded-[2px] border border-neutral-300 bg-high-vis-white',
  'font-ui text-base text-charcoal placeholder:text-neutral-500',
  'focus:border-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-red',
  'aria-invalid:border-error',
  'disabled:opacity-50 disabled:pointer-events-none',
];

export interface FieldProps {
  label: string;
  /** Ties the label to the control. Also names the error element. */
  htmlFor?: string | undefined;
  /** "Optional", or a unit. Sits beside the label, never below it. */
  hint?: string | undefined;
  /**
   * The message, when there is one. Rendered with `role="alert"` so a reader
   * who has just failed validation is told rather than left to notice.
   */
  error?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={htmlFor}
        className="block font-ui text-sm font-semibold text-charcoal"
      >
        {label}
        {hint ? <span className="ml-2 font-normal text-neutral-500">{hint}</span> : null}
      </label>

      <div className="mt-2">{children}</div>

      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="mt-1.5 font-ui text-sm text-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A file input's native button is the one control the browser draws itself.
 * Styling `::file-selector-button` makes it read as one of ours: the same
 * dark block as a secondary Button, flush left, the chosen file name beside
 * it. The label text stays the browser's, it cannot be changed from CSS.
 */
const FILE_CONTROL = [
  'cursor-pointer pl-0 leading-none',
  'file:mr-3 file:h-full file:cursor-pointer file:border-0 file:bg-charcoal file:px-4',
  'file:font-ui file:text-sm file:font-semibold file:uppercase file:tracking-[0.09em] file:text-high-vis-white',
];

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(CONTROL, 'h-11 px-3', props.type === 'file' && FILE_CONTROL, className)}
      {...props}
    />
  );
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea ref={ref} rows={rows} className={cn(CONTROL, 'px-3 py-2.5', className)} {...props} />
  );
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * A select that looks like the rest of the site rather than like the operating
 * system. `appearance-none` plus a drawn chevron, because a native control is
 * the one place a design system silently stops applying.
 *
 * The chevron is `pointer-events-none`, or it swallows the click that is
 * supposed to open the menu.
 *
 * `className` lands on the WRAPPING span, not the `<select>` itself. The span
 * is the element that actually sits in a caller's flex row, so a caller
 * sizing this control with `sm:flex-1 lg:w-auto` needs that class on the
 * element flex layout sees. Putting it on the `<select>` instead left every
 * one of those classes inert: the `<select>` was already `w-full` of its own
 * span regardless, and the span itself, hardcoded `w-full` with no basis
 * override, claimed the whole row at every breakpoint and forced each
 * control onto its own line. That was the shop filter bar's real bug, not a
 * styling gap: `apps/storefront/src/components/shop-controls.tsx` passed
 * exactly the right classes and none of them were reaching anything.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <span className={cn('relative block w-full min-w-0', className)}>
      <select
        ref={ref}
        className={cn(CONTROL, 'h-11 w-full cursor-pointer appearance-none pl-3 pr-9')}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-current text-neutral-500"
        fill="none"
        strokeWidth="1.8"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
});
