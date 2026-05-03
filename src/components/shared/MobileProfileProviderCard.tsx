'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PLACEHOLDER_IMAGE } from '@/utils/imageUtils';

interface MobileProfileProviderCardProps {
  imageUrl: string;
  title: string;
  category: string;
  likes: number;
  savedText?: string;
  onClick?: () => void;
}

export function MobileProfileProviderCard({
  imageUrl,
  title,
  category,
  likes,
  savedText = 'Gespeichert',
  onClick,
}: MobileProfileProviderCardProps) {
  const [imageError, setImageError] = useState(false);

  // Validate and normalize image URL
  const normalizedImageUrl = (() => {
    if (!imageUrl || imageUrl.trim() === '' || imageError) {
      return PLACEHOLDER_IMAGE;
    }
    // If it's already a full URL (starts with http:// or https://), use it as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // If it's a relative path, ensure it starts with /
    if (imageUrl.startsWith('/')) {
      return imageUrl;
    }
    // Otherwise, treat as relative path
    return `/${imageUrl}`;
  })();

  return (
    <div
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-white p-3"
      onClick={onClick}
    >
      {/* Image */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          alt={title}
          className="h-full w-full object-cover"
          height={64}
          src={normalizedImageUrl}
          unoptimized={normalizedImageUrl.startsWith('http')}
          width={64}
          onError={() => setImageError(true)}
        />
      </div>
      
      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Title */}
        <div className="min-w-0 truncate font-inter-tight text-base font-semibold text-[#232323]" title={title}>
          {title}
        </div>
        
        {/* Category */}
        <div className="font-inter text-sm text-[#555]">
          {category}
        </div>
        
        {/* Likes */}
        <div className="font-inter text-sm text-[#555]">
          {likes}x {savedText}
        </div>
      </div>
    </div>
  );
}
