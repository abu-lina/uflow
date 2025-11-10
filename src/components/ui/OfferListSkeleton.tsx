/**
 * OfferListSkeleton
 * 
 * Skeleton loading component for the offers list.
 * Matches the actual layout of the offers page for better perceived performance.
 */

import { Skeleton } from './skeleton/Skeleton';

export function OfferListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Search bar skeleton */}
      <Skeleton className="h-[40px] w-full rounded-2xl" />

      {/* Section skeletons */}
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

