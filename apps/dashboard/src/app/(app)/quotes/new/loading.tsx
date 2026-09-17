import { Skeleton, SkeletonScreen } from '@beco/ui';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading new quote">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-11 w-56 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 w-full rounded-panel" />
        <Skeleton className="h-96 w-full rounded-panel" />
      </div>
    </SkeletonScreen>
  );
}
