import { Skeleton } from "@/components/ui/feedback/skeleton"

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="aspect-[4/3] relative">
        <Skeleton.Rect className="w-full h-full" />
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton.Text className="w-3/4 h-6" />
          <Skeleton.Text className="w-full h-4" />
          <Skeleton.Text className="w-1/2 h-4" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton.Text className="w-24 h-4" />
            <Skeleton.Text className="w-16 h-4" />
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <Skeleton.Text className="w-1/2 h-full" />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Skeleton.Text className="w-24 h-8" />
          <Skeleton.Text className="w-16 h-8" />
        </div>
      </div>
    </div>
  )
} 