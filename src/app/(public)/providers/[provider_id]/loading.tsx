function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-light ${className}`} />;
}

export default function ProviderDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 border-b border-neutral-200 bg-white px-6 py-4">
        <LoadingBlock className="h-8 w-32" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-[361px] space-y-6">
          {/* Image skeleton */}
          <LoadingBlock className="aspect-[4/3] w-full rounded-2xl" />

          {/* Title skeleton */}
          <LoadingBlock className="h-8 w-3/4" />

          {/* Address skeleton */}
          <LoadingBlock className="h-5 w-1/2" />

          {/* Action buttons skeleton */}
          <div className="flex gap-3">
            <LoadingBlock className="h-12 flex-1 rounded-xl" />
            <LoadingBlock className="h-12 flex-1 rounded-xl" />
          </div>

          {/* Description skeleton */}
          <div className="space-y-2">
            <LoadingBlock className="h-4 w-full" />
            <LoadingBlock className="h-4 w-full" />
            <LoadingBlock className="h-4 w-3/4" />
          </div>

          {/* Offers/Needs skeleton */}
          <div className="space-y-4">
            <LoadingBlock className="h-6 w-24" />
            <div className="flex flex-wrap gap-2">
              <LoadingBlock className="h-8 w-20 rounded-full" />
              <LoadingBlock className="h-8 w-24 rounded-full" />
              <LoadingBlock className="h-8 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

