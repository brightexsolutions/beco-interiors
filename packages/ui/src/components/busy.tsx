import { cn } from '../lib/cn';
import { Spinner } from './spinner';

/**
 * A status line for work that has no button of its own: a list reloading
 * after a filter change, a page re-rendering after a sort. Rendered always,
 * so the live region exists before it has anything to say; a region that
 * appears already populated is not announced. While `pending` it shows the
 * spinner and the words, otherwise it is empty and takes no space. D117.
 */
export function Busy({
  pending,
  label = 'Updating',
  className,
}: {
  pending: boolean;
  /** Present participle, two words at most: "Updating", "Loading more". */
  label?: string;
  className?: string | undefined;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'inline-flex items-center gap-2 font-ui text-sm text-neutral-500',
        !pending && 'hidden',
        className,
      )}
    >
      {pending ? (
        <>
          <Spinner />
          {label}
        </>
      ) : null}
    </span>
  );
}
