/**
 * Loading state for profile page
 * Displays skeleton UI while user data is being fetched
 */
export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="mb-6 flex items-center gap-4">
          {/* Avatar skeleton */}
          <div className="h-20 w-20 rounded-full bg-gray-200"></div>
          
          {/* User info skeleton */}
          <div className="flex-1">
            <div className="mb-2 h-8 w-48 rounded bg-gray-200"></div>
            <div className="h-4 w-64 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-32 animate-pulse rounded-t bg-gray-200"></div>
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="h-40 bg-gray-200"></div>
            <div className="p-4">
              <div className="mb-3 h-6 w-3/4 rounded bg-gray-200"></div>
              <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-2/3 rounded bg-gray-200"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
