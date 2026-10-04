import { cn } from '../lib/cn';

/**
 * The one "working" mark. A quarter arc in the current text colour, so it
 * reads on any button variant and in any status line without a colour of
 * its own. Rotation is a transform, nothing else moves, and under
 * prefers-reduced-motion it holds still: the arc plus the words around it
 * still say busy, the spin was only emphasis. D117.
 *
 * Always decorative. The element beside it carries the words.
 */
export function Spinner({ className }: { className?: string | undefined }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 20"
      className={cn('h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none', className)}
    >
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
