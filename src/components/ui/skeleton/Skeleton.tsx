import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-label="Loading..."
      className={cn(
        'relative overflow-hidden rounded-md bg-neutral-light',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        className
      )}
      role="status"
    >
      <div className="h-full w-full bg-neutral-light" />
    </div>
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
