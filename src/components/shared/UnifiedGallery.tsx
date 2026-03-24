'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useImageFallback } from '@/hooks/useImageFallback';
import type { Category } from '@/services/categories';

const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

interface UnifiedGalleryProps {
  categoryId: string;
  category?: Category;
  entityType: 'provider' | 'community_service';
  className?: string;
}

export default function UnifiedGallery({ 
  categoryId, 
  category, 
  entityType,
  className = "flex aspect-[16/9] min-h-[240px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]"
}: UnifiedGalleryProps) {
  const { images, loading, error } = useImageFallback({
    categoryId,
    category,
    entityType,
    limit: 3,
  });
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());

  // Always ensure we have exactly 3 images
  const displayImages = [...images];
  while (displayImages.length < 3) {
    displayImages.push(PLACEHOLDER_IMAGE);
  }

  if (loading) {
    return (
      <div className={className}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`relative h-full w-1/3 overflow-hidden border border-white bg-neutral-200 ${
              i === 0 ? 'rounded-l-[29px]' : ''
            } ${i === 2 ? 'rounded-r-[29px]' : ''}`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-danger md:hidden">{error}</div>;
  }

  return (
    <div className={className}>
      {displayImages.slice(0, 3).map((imageUrl, index) => {
        const effectiveSrc = failedIndexes.has(index) ? PLACEHOLDER_IMAGE : imageUrl;
        return (
          <div
            key={index}
            className={`relative h-full w-1/3 overflow-hidden ${
              index === 0 ? 'rounded-l-[29px]' : ''
            } ${index === 2 ? 'rounded-r-[29px]' : ''}`}
          >
            <Image
              fill
              alt={
                effectiveSrc === PLACEHOLDER_IMAGE
                  ? `Placeholder image ${index + 1}`
                  : effectiveSrc.includes('provider-images') || effectiveSrc.includes('providers')
                  ? `Provider image ${index + 1}`
                  : effectiveSrc.includes('community-service-images') || effectiveSrc.includes('community-services')
                  ? `Community service image ${index + 1}`
                  : `Category image ${index + 1}`
              }
              className={`border border-white object-cover ${
                index === 0 ? 'rounded-l-[29px]' : ''
              } ${index === 2 ? 'rounded-r-[29px]' : ''}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              priority={index === 0}
              sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, 33vw"
              src={effectiveSrc}
              onError={() => {
                if (!failedIndexes.has(index)) {
                  setFailedIndexes((prev) => new Set(prev).add(index));
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
