import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A fact stated at the moment it matters, in weight rather than a box.
 *
 * The earlier version was a coloured left border on a tinted fill, the exact
 * bordered-callout default every AI-shaped interface reaches for, and it
 * could not even carry its own colour safely: `border-warm-red` read fine on
 * the quote page's white form column and disappeared into the same page's
 * charcoal list panel, since no single accent tone clears AA against both. A
 * heavier weight inherits whatever the surrounding text colour already is,
 * so it works wherever it is dropped without a light or dark variant to
 * maintain.
 *
 * Never a substitute for field level validation: `alert` states something
 * that already happened, it does not replace an error shown against the
 * input that caused it.
 */
export interface NoticeProps {
  children: ReactNode;
  /** `info` states a fact, in the ambient text colour. `alert` states a problem, and is announced. */
  tone?: 'info' | 'alert' | undefined;
  className?: string | undefined;
}

export function Notice({ children, tone = 'info', className }: NoticeProps) {
  return (
    <p
      role={tone === 'alert' ? 'alert' : undefined}
      className={cn(
        'font-ui text-sm font-semibold',
        tone === 'alert' ? 'text-error' : undefined,
        className,
      )}
    >
      {children}
    </p>
  );
}
