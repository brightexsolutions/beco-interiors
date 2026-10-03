import { Skeleton, SkeletonScreen } from '@beco/ui';

/**
 * The quotes queue while it loads: heading, the filter row, then rows. Eight
 * rows because that is roughly a first screenful, so the list does not grow
 * under the reader's eyes when the real data lands.
 */
export default function Loading() {
  return (
    <SkeletonScreen label="Loading quotes">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-10 w-44" />

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Skeleton className="h-11" />
        <Skeleton className="h-11 sm:w-40" />
        <Skeleton className="h-11 sm:w-36" />
        <Skeleton className="h-11 sm:w-36" />
      </div>

      <div className="mt-6 space-y-px">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
