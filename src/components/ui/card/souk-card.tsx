import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface SoukCardProps {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  location: string | null;
  category: string | null;
  price_range: string | null;
  rating: number | null;
  review_count: number;
  className?: string;
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
  className,
}: SoukCardProps) {
  return (
    <Link className={cn('block', className)} href={`/souk/${id}`}>
      <div className="overflow-hidden rounded-lg bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3]">
          {image_url ? (
            <Image fill alt={name} className="object-cover" src={image_url} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="mb-1 text-lg font-semibold">{name}</h3>
          {description && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {location && <span>{location}</span>}
            {category && <span>• {category}</span>}
            {price_range && <span>• {price_range}</span>}
          </div>
          {rating !== null && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({review_count} reviews)</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
