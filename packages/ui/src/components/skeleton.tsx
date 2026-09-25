import { cn } from '../lib/cn';

/**
 * One block of a loading skeleton. Sized by the call site, because a
 * skeleton is only worth having if it matches the shape of what is coming:
 * a generic grey box that gets replaced by a different layout causes the
 * exact shift it was supposed to prevent, and CLS is a budget on this
 * project, not a preference.
 *
 * `aria-hidden`, because the individual blocks are noise. The surrounding
 * `SkeletonScreen` is what announces that something is loading.
 */
export function Skeleton({ className }: { className?: string | undefined }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block rounded-card bg-neutral-100',
        // A reader who asked for no motion still gets the shape, without
        // the breathing.
        'animate-pulse motion-reduce:animate-none',
        className,
      )}
    />
  );
}

/**
 * The frame around a set of skeleton blocks. One live region per screen, so
 * a screen reader hears "Loading quotes" once rather than a block per row.
 */
export function SkeletonScreen({
  label,
  children,
  className,
}: {
  /** What is loading, named: "Loading quotes", not "Loading". */
  label: string;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}
