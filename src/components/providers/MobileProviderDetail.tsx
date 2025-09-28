import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { Provider } from '@/services/providers';

interface MobileProviderDetailProps {
  provider: Provider;
}

export const MobileProviderDetail: React.FC<MobileProviderDetailProps> = ({ provider }) => {
  const router = useRouter();
  
  // Image handling
  const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';
  
  const allImageUrls = (() => {
    try {
      if (!provider.provider_images) {
        return [PLACEHOLDER_IMAGE];
      }
      let imagesData: { urls?: string[] } = {};
      if (typeof provider.provider_images === 'string') {
        try {
          imagesData = JSON.parse(provider.provider_images) as { urls?: string[] };
        } catch {
          imagesData = {};
        }
      } else if (Array.isArray(provider.provider_images)) {
        imagesData.urls = provider.provider_images;
      }
      if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
        return imagesData.urls;
      }
      return [PLACEHOLDER_IMAGE];
    } catch {
      return [PLACEHOLDER_IMAGE];
    }
  })();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    setSelectedImageIdx((prev) => (prev - 1 + allImageUrls.length) % allImageUrls.length);
  }, [allImageUrls.length]);

  const goToImage = (index: number) => {
    setSelectedImageIdx(index);
  };

  // Touch/Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (allImageUrls.length <= 1) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || allImageUrls.length <= 1) return;
    
    const currentX = e.touches[0].clientX;
    const offsetX = currentX - dragStartX;
    setDragOffset(offsetX);
  };

  const handleTouchEnd = () => {
    if (!isDragging || allImageUrls.length <= 1) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const threshold = 80;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && selectedImageIdx > 0) {
        goToPrevious();
      } else if (dragOffset < 0 && selectedImageIdx < allImageUrls.length - 1) {
        setSelectedImageIdx((prev) => (prev + 1) % allImageUrls.length);
      }
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div className="flex w-full max-w-[393px] flex-col items-start px-6 pt-6">
      {/* Image + Page Indicator Section */}
      <div className="flex w-full flex-col items-start gap-2">
        {/* Image Container */}
        <div className="relative h-[312.52px] w-full overflow-hidden rounded-3xl">
          {/* Image Carousel */}
          <div
            ref={imageContainerRef}
            className="flex h-full w-full"
            style={{
              transform: isDragging && Math.abs(dragOffset) > 10
                ? `translateX(calc(-${selectedImageIdx * 100}% + ${dragOffset}px))`
                : `translateX(-${selectedImageIdx * 100}%)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
          >
            {allImageUrls.map((imageUrl, index) => (
              <div
                key={index}
                className="relative h-full w-full flex-shrink-0"
                style={{ minWidth: '100%' }}
              >
                <Image
                  fill
                  alt={`${provider.provider_name} ${index + 1}`}
                  className="object-cover"
                  src={imageUrl}
                />
              </div>
            ))}
          </div>

          {/* Back Button - Left Chevron */}
          <div className="absolute left-0 top-0 flex h-[63.78px] w-full items-start justify-start p-4 z-10">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[9.53514px] border-[0.794595px] border-[#CDCDCD] bg-white/70 backdrop-blur-[1.98649px]"
              type="button"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5 text-[#232323]" />
            </button>
          </div>

          {/* Category Frame - positioned at bottom */}
          <div className="absolute bottom-0 left-0 flex h-full w-full items-end justify-start p-4">
            <div className="flex h-8 items-center justify-center rounded-sm border border-[#CDCDCD] bg-white/70 px-[10.59px] backdrop-blur-[1.99px]">
              <span className="font-inter-tight text-sm font-medium text-black">
                {provider.category?.name_de || 'Kategorie'}
              </span>
            </div>
          </div>
        </div>

        {/* Page Switcher */}
        {allImageUrls.length > 1 && (
          <div className="flex w-full justify-center gap-[10.67px]">
            {allImageUrls.map((_, index) => (
              <button
                key={index}
                className={`h-4 w-4 rounded-[1.01px] transition-colors ${
                  selectedImageIdx === index
                    ? 'h-4 w-4 bg-[#589D96] rounded-[1.35px]'
                    : 'h-3 w-3 bg-[#CDCDCD] rounded-[1.01px]'
                }`}
                type="button"
                onClick={() => goToImage(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
