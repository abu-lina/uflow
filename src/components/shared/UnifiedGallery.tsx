'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useImageFallback } from '@/hooks/useImageFallback';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Category } from '@/services/categories';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

interface UnifiedGalleryProps {
  categoryId: string;
  category?: Category;
  entityType?: 'provider'; // M-5a: community_service entityType removed
  className?: string;
}

export default function UnifiedGallery({ 
  categoryId, 
  category, 
  entityType,
  className = "flex aspect-[16/9] min-h-[240px] w-full overflow-hidden rounded-[29px] sm:aspect-[16/9] md:hidden md:aspect-[16/9]"
}: UnifiedGalleryProps) {
  const { t } = useLanguage();
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
            className="relative h-full w-1/3 overflow-hidden border border-white bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-danger md:hidden">{t(error)}</div>;
  }

  return (
    <div className={className}>
      {displayImages.slice(0, 3).map((imageUrl, index) => {
        const effectiveSrc = failedIndexes.has(index) ? PLACEHOLDER_IMAGE : imageUrl;
        return (
          <div
            key={index}
            className="relative h-full w-1/3 overflow-hidden"
          >
            <Image
              fill
              alt={
                effectiveSrc === PLACEHOLDER_IMAGE
                  ? t('providers.placeholderImage', { index: index + 1 })
                  : effectiveSrc.includes('provider-images') || effectiveSrc.includes('providers')
                  ? t('providers.providerImage', { index: index + 1 })
                  : effectiveSrc.includes('community-service-images') || effectiveSrc.includes('community-services')
                  ? t('providers.communityServiceImage', { index: index + 1 })
                  : t('providers.categoryImage', { index: index + 1 })
              }
              className="border border-white object-cover"
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
