import { Skeleton, SkeletonScreen } from '@beco/ui';
import { NewUserFab } from '@/components/new-user';

export default function Loading() {
  return (
    <SkeletonScreen label="Loading users">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-10 w-36" />
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Skeleton className="h-11" />
        <Skeleton className="h-11 sm:w-48" />
        <Skeleton className="h-11 sm:w-40" />
      </div>
      <div className="mt-6 space-y-px pb-24">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
      <NewUserFab />
    </SkeletonScreen>
  );
}
