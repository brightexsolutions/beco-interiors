import { Skeleton, SkeletonScreen } from '@beco/ui';

/**
 * The fallback for any dashboard screen without a shape of its own. It draws
 * a heading and a card grid because that is what most of them are; the two
 * screens that look different (the quotes queue and a quote) carry their
 * own, closer, skeletons.
 */
export default function Loading() {
  return (
    <SkeletonScreen label="Loading">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-10 w-72 max-w-full" />
      <Skeleton className="mt-4 h-5 w-56 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[8.5rem]" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
