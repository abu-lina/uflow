import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect' | 'card'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Skeleton({
  className,
  variant = 'text',
  size = 'md',
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded-md"
  
  const variantClasses = {
    text: "h-4",
    circle: "rounded-full",
    rect: "h-24",
    card: "h-48"
  }

  const sizeClasses = {
    sm: "w-16",
    md: "w-32",
    lg: "w-64",
    xl: "w-full"
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

// Compound components for common patterns
Skeleton.Text = function SkeletonText({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="text" className={className} {...props} />
}

Skeleton.Circle = function SkeletonCircle({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="circle" className={className} {...props} />
}

Skeleton.Rect = function SkeletonRect({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="rect" className={className} {...props} />
}

Skeleton.Card = function SkeletonCard({ className, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="card" className={className} {...props} />
} 