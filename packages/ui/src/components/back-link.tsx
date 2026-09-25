import { cn } from '../lib/cn';

export interface BackLinkProps {
  /** Where back goes. A real destination, never `history.back()`: a quote
   *  opened from a notification or a pasted link has no history to go back
   *  to, and a control that does nothing on first load is the decorative
   *  kind rule 3 forbids. */
  href: string;
  /** Names the destination, not the direction. "Quotes", not "Back", so the
   *  label tells you where you land before you tap it. */
  children: React.ReactNode;
  className?: string | undefined;
}

/**
 * The way out of a detail screen. Sits above the heading, reads as a quiet
 * line of text, and carries a 44px touch target, because it is the control a
 * thumb reaches for most on a phone and the one most often built too small.
 *
 * Plain `<a>` rather than next/link, the same as ProductCard: this package
 * stays free of the router so it can be rendered by anything.
 */
export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex min-h-[2.75rem] items-center gap-1.5 font-ui text-sm font-semibold text-neutral-500',
        'transition-colors hover:text-charcoal focus-visible:text-charcoal',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {children}
    </a>
  );
}
