import { Skeleton, SkeletonScreen } from '@beco/ui';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading catalogue">
      <Skeleton className="h-4 w-20" />
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
