import { Skeleton, SkeletonScreen } from '@beco/ui';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading settings">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-10 w-40" />
      <div className="mt-8 flex gap-2 border-b border-neutral-200 pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-24" />
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
