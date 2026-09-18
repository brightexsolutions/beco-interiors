import { Skeleton, SkeletonScreen } from '@beco/ui';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading reports">
      <Skeleton className="h-4 w-16" />
      <div className="mt-3 flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-11 w-52" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 lg:h-24" />
        ))}
      </div>
      <Skeleton className="mt-8 h-11 w-full" />
      <Skeleton className="mt-6 h-48" />
      <div className="mt-6 space-y-px">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
