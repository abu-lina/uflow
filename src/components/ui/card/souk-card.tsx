import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

interface SoukCardProps {
  id: string
  name: string
  description: string | null
  image_url: string | null
  location: string | null
  category: string | null
  price_range: string | null
  rating: number | null
  review_count: number
  className?: string
}

export function SoukCard({
  id,
  name,
  description,
  image_url,
  location,
  category,
  price_range,
  rating,
  review_count,
  className
}: SoukCardProps) {
  return (
    <Link href={`/souk/${id}`} className={cn("block", className)}>
      <div className="rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="relative aspect-[4/3]">
          {image_url ? (
            <Image
              src={image_url}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {location && <span>{location}</span>}
            {category && <span>• {category}</span>}
            {price_range && <span>• {price_range}</span>}
          </div>
          {rating !== null && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({review_count} reviews)
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
} 