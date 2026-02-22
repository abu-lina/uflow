/**
 * Loading state for providers list page
 * Displays skeleton UI while data is being fetched
 */
export default function ProvidersLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="mb-4 h-8 w-48 rounded bg-gray-200"></div>
        <div className="h-4 w-96 rounded bg-gray-200"></div>
      </div>

      {/* Search and filter skeletons */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-200"></div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200 sm:w-48"></div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200 sm:w-48"></div>
      </div>

      {/* Provider cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            {/* Image skeleton */}
            <div className="h-48 bg-gray-200"></div>
            
            {/* Content skeleton */}
            <div className="p-4">
              <div className="mb-3 h-6 w-3/4 rounded bg-gray-200"></div>
              <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
              <div className="mb-4 h-4 w-2/3 rounded bg-gray-200"></div>
              
              {/* Tags skeleton */}
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-gray-200"></div>
                <div className="h-6 w-24 rounded-full bg-gray-200"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
