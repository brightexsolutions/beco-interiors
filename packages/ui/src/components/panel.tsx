import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A dashboard work surface: white panel, 1px rule, rounded-panel.
 * List toolbars, inspector rails, and create-flow columns use this so
 * screens do not each invent a card.
 */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  const hasChrome = title != null || action != null;
  return (
    <section
      className={cn(
        'overflow-hidden rounded-panel border border-neutral-200 bg-high-vis-white',
        className,
      )}
    >
      {hasChrome ? (
        <header className="flex flex-col gap-3 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-end sm:px-5">
          {title ? <div className="min-w-0 flex-1">{title}</div> : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
