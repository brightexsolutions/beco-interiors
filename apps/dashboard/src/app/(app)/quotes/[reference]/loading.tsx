import { Skeleton, SkeletonScreen } from '@beco/ui';

/**
 * One quote while it loads. Mirrors the real two column split, including the
 * `min-w-0` that keeps the line items from widening the page on a phone, so
 * the swap to real content moves nothing.
 */
export default function Loading() {
  return (
    <SkeletonScreen label="Loading quote">
      <Skeleton className="h-11 w-24" />
      <Skeleton className="mt-2 h-4 w-20" />
      <Skeleton className="mt-3 h-11 w-64 max-w-full" />
      <Skeleton className="mt-3 h-5 w-52 max-w-full" />

      <div className="mt-6 flex gap-1.5">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="min-w-0">
          <Skeleton className="h-4 w-28" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Skeleton className="h-7 w-40" />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-5 w-40" />
              <Skeleton className="mt-1.5 h-5 w-32" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
