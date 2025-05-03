interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-label="Loading..."
      className={`animate-pulse rounded-md bg-gray-200 ${className ?? ''}`}
      role="status"
    />
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="size-full rounded-md bg-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="size-full rounded-md bg-gray-200" />
      </div>
      <div className="h-10 w-full rounded-md bg-gray-200" />
    </div>
  );
}
