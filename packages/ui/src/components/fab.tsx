import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * A floating action. The one thing you can do from anywhere on a scrolling
 * screen, kept under the thumb on a phone.
 *
 * Charcoal, not Warm Red: Warm Red is reserved for genuine attention states
 * (a new quote in the queue, something overdue). Raising a quote is the
 * ordinary job of this screen, so the control is brand black.
 *
 * Pill, not a circular plus. A round icon-only FAB is the Material default
 * this dashboard is not allowed to look like. The label is the control.
 *
 * Same as Button: the classes are exported for genuine links, so a "New
 * quote" FAB stays an `<a>` and keeps middle click.
 */
const fab = cva([
  'fixed z-40 inline-flex items-center justify-center',
  // Above the dashboard's bottom bar where there is one (`--dock`), else the thumb's reach.
  'right-4 bottom-[calc(var(--dock,0px)+max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem)))]',
  'lg:right-8 lg:bottom-8',
  'min-h-14 px-6',
  'font-ui font-semibold uppercase tracking-[0.09em] text-sm',
  'rounded-full bg-charcoal text-high-vis-white',
  'shadow-panel hover:bg-neutral-700',
  'transition-colors duration-200 ease-brand',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px]',
  'focus-visible:outline-warm-red',
]);

export const fabClasses = fab;

export type FabProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof fab>;

export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  { className, ...props },
  ref,
) {
  return <button ref={ref} className={cn(fab(), className)} {...props} />;
});
