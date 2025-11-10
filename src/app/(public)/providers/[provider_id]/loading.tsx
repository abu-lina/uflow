import { Skeleton } from '@/components/ui/skeleton/Skeleton';

export default function ProviderDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 py-4">
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-[361px] space-y-6">
          {/* Image skeleton */}
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />

          {/* Title skeleton */}
          <Skeleton className="h-8 w-3/4" />

          {/* Address skeleton */}
          <Skeleton className="h-5 w-1/2" />

          {/* Action buttons skeleton */}
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Offers/Needs skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

