import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * Groups fields inside a sheet or inspector the same way quote detail
 * groups Actions, Customer and Dates: a quiet uppercase heading, then
 * the controls. Use this so product, user and order sheets do not each
 * invent a divider.
 */
export function FormSection({
  title,
  hint,
  columns = 1,
  children,
  className,
}: {
  title?: string | undefined;
  hint?: string | undefined;
  columns?: 1 | 2 | 3 | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      {title ? (
        <h3 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
          {title}
        </h3>
      ) : null}
      {hint ? (
        <p className={cn('font-ui text-base text-neutral-500', title ? 'mt-2' : null)}>{hint}</p>
      ) : null}
      <div
        className={cn(
          'grid min-w-0 gap-4',
          title || hint ? 'mt-4' : null,
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {children}
      </div>
    </section>
  );
}
