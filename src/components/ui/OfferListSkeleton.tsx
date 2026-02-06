/**
 * OfferListSkeleton
 * 
 * Skeleton loading component for the offers list.
 * Matches the actual layout of the offers page for better perceived performance.
 */

export function OfferListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Search bar skeleton - matches actual search bar height and styling */}
      <div className="relative h-[40px] w-full overflow-hidden rounded-2xl bg-neutral-200">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      </div>

      {/* Section skeletons - matches collapsible sections with proper spacing */}
      <div className="space-y-3">
        {/* Selected offers section skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-background/50 p-4 shadow-sm">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="space-y-3">
            <div className="h-6 w-32 rounded bg-neutral-200" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-xl bg-neutral-200" />
              ))}
            </div>
          </div>
        </div>

        {/* Suggested offers section skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-background/50 p-4 shadow-sm">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="space-y-3">
            <div className="h-6 w-48 rounded bg-neutral-200" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-28 rounded-xl bg-neutral-200" />
              ))}
            </div>
          </div>
        </div>

        {/* Other offers section skeleton */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-background/50 p-4 shadow-sm">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="space-y-3">
            <div className="h-6 w-40 rounded bg-neutral-200" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 w-32 rounded-xl bg-neutral-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

