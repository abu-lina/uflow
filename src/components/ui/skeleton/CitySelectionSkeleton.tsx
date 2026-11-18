import { Skeleton } from './Skeleton';

export function CitySelectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="mx-auto h-3 w-3/4 rounded" />
    </div>
  );
}
