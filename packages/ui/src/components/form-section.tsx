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
  children,
  className,
}: {
  title: string;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      <h3 className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {title}
      </h3>
      {hint ? <p className="mt-2 font-ui text-base text-neutral-500">{hint}</p> : null}
      <div className={cn('grid min-w-0 gap-4', hint ? 'mt-4' : 'mt-3')}>{children}</div>
    </section>
  );
}
