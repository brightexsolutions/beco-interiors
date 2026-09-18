import { Skeleton, SkeletonScreen } from '@beco/ui';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading orders">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-10 w-44" />

      <div className="mt-6 grid min-w-0 grid-cols-3 gap-2 lg:flex lg:items-end">
        <Skeleton className="col-span-full h-11 lg:flex-1" />
        <Skeleton className="h-11 lg:w-40" />
        <Skeleton className="h-11 lg:w-40" />
        <Skeleton className="h-11 lg:w-40" />
      </div>

      <div className="mt-6 space-y-px">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
