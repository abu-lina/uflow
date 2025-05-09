import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-label="Loading..."
      className={cn('animate-pulse rounded-md bg-border', className)}
      role="status"
    />
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="size-4 rounded bg-border" />
        <div className="size-full rounded-md bg-border" />
      </div>
      <div className="space-y-2">
        <div className="size-4 rounded bg-border" />
        <div className="size-full rounded-md bg-border" />
      </div>
      <div className="size-10 rounded-md bg-border" />
    </div>
  );
}
