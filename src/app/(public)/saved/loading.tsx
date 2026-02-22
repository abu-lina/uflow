/**
 * Loading state for saved/bookmarked items page
 * Displays skeleton UI while bookmarks are being fetched
 */
export default function SavedLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="mb-4 h-8 w-56 rounded bg-gray-200"></div>
        <div className="h-4 w-full max-w-md rounded bg-gray-200"></div>
      </div>

      {/* Filter skeleton */}
      <div className="mb-6 flex gap-4">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-gray-200"></div>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-gray-200"></div>
      </div>

      {/* Bookmarked items skeleton */}
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
