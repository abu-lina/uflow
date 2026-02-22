/**
 * Loading state for community services list page
 * Displays skeleton UI while data is being fetched
 */
export default function CommunityServicesLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="mb-4 h-8 w-56 rounded bg-gray-200"></div>
        <div className="h-4 w-full max-w-xl rounded bg-gray-200"></div>
      </div>

      {/* Search and filter skeletons */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-200"></div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200 sm:w-48"></div>
      </div>

      {/* Service cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            {/* Logo/Image skeleton */}
            <div className="flex items-center justify-center bg-gray-100 p-6">
              <div className="h-20 w-20 rounded-full bg-gray-200"></div>
            </div>
            
            {/* Content skeleton */}
            <div className="p-4">
              <div className="mb-3 h-6 w-3/4 rounded bg-gray-200"></div>
              <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
              <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
              <div className="mb-4 h-4 w-1/2 rounded bg-gray-200"></div>
              
              {/* Stats skeleton */}
              <div className="flex items-center gap-4">
                <div className="h-4 w-16 rounded bg-gray-200"></div>
                <div className="h-4 w-16 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
