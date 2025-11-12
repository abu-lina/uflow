import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useImageSwipe } from '@/hooks/useImageSwipe';
import { useLanguage } from '@/providers/LanguageProvider';
import { getAllTrustedImageUrlsWithFallback, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';
import type { Provider } from '@/services/providers';

interface CategoryInfo {
  name_de: string;
  name_en?: string;
  category_images?: Record<string, unknown>;
}

interface MobileProviderDetailProps {
  provider: Provider;
  onBack?: () => void;
}

export const MobileProviderDetail: React.FC<MobileProviderDetailProps> = ({ provider, onBack }) => {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  // Helper function to get category name based on language
  const getCategoryName = (category: CategoryInfo | undefined) => {
    if (!category) return t('search.unnamed');
    if (language === 'en') {
      return category.name_en || category.name_de || t('search.unnamed');
    } else {
      return category.name_de || category.name_en || t('search.unnamed');
    }
  };
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };
  
  // Process images using shared utility with category fallback
  const imageUrls = getAllTrustedImageUrlsWithFallback(
    provider.provider_images, 
    provider.category?.category_images
  );
  const allImageUrls = imageUrls.length > 0 ? imageUrls : [PLACEHOLDER_IMAGE];

  // Use the centralized image swipe hook
  const {
    selectedImageIdx,
    imageContainerRef,
    goToNext,
    goToPrevious,
    goToImage,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getTransformStyle,
  } = useImageSwipe({
    totalImages: allImageUrls.length,
    enableSwipe: true,
    swipeThreshold: 60,
    boundaryResistance: 0.15,
    velocityThreshold: 0.3,
    minSwipeDistance: 30,
  });

  return (
    <div className="flex w-full flex-col items-start px-6 pt-6">
      {/* Image + Page Indicator Section */}
      <div className="flex w-full flex-col items-start gap-2">
        {/* Image Container */}
        <div 
          aria-label={`${provider.provider_name} image gallery with ${allImageUrls.length} images`}
          className="relative h-[312.52px] w-full overflow-hidden rounded-3xl touch-pan-x"
          role="img"
          style={{ touchAction: 'pan-x' }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' && selectedImageIdx > 0) {
              goToPrevious();
            } else if (e.key === 'ArrowRight' && selectedImageIdx < allImageUrls.length - 1) {
              goToNext();
            }
          }}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
        >
          {/* Image Carousel */}
          <div
            ref={imageContainerRef}
            className="flex h-full w-full"
            style={getTransformStyle()}
          >
            {allImageUrls.map((imageUrl, index) => (
              <div
                key={index}
                className="relative h-full w-full flex-shrink-0"
                style={{ minWidth: '100%' }}
              >
                <Image
                  fill
                  alt={`${provider.provider_name} image ${index + 1}`}
                  className="object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  sizes="(max-width: 768px) 100vw, 393px"
                  src={imageUrl}
                  onError={(_e) => {
                    console.warn(`Failed to load image ${index + 1}:`, imageUrl);
                    // Could set a fallback image here
                  }}
                />
              </div>
            ))}
          </div>

          {/* Back Button - Left Chevron */}
          <div className="absolute left-0 top-0 flex h-[63.78px] w-full items-start justify-start p-4 z-10">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-[9.53514px] border-[0.794595px] border-[#CDCDCD] bg-white/70 backdrop-blur-[1.98649px]"
              type="button"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5 text-[#232323]" />
            </button>
          </div>


          {/* Category Frame - positioned at bottom */}
          <div className="absolute bottom-0 left-0 flex h-full w-full items-end justify-start p-4">
            <div className="flex h-8 items-center justify-center rounded-sm border border-[#CDCDCD] bg-white/70 px-[10.59px] backdrop-blur-[1.99px]">
              <span className="font-inter-tight text-sm font-medium text-black">
                {getCategoryName(provider.category)}
              </span>
            </div>
          </div>
        </div>

        {/* Page Switcher */}
        {allImageUrls.length > 1 && (
          <div className="flex w-full items-center justify-center gap-[10.67px]">
            {allImageUrls.map((_, index) => (
              <button
                key={index}
                aria-current={selectedImageIdx === index ? 'true' : 'false'}
                aria-label={`Go to image ${index + 1} of ${allImageUrls.length}`}
                className={`flex items-end justify-center focus:outline-none ${
                  selectedImageIdx === index ? 'h-[16px] w-[16px]' : 'h-[12px] w-[12px]'
                }`}
                type="button"
                onClick={() => goToImage(index)}
              >
                <svg
                  fill="none"
                  height={selectedImageIdx === index ? "16" : "12"}
                  viewBox="0.279844 0.519531 12.331856 11.999969"
                  width={selectedImageIdx === index ? "16" : "12"}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M4.91761 11.1245C4.72652 10.9208 4.45968 10.8052 4.1804 10.8052C4.45968 10.8052 4.72652 10.9208 4.91761 11.1245ZM1.99879 8.61892C1.99879 8.34013 1.88365 8.07372 1.68061 7.88268C1.88365 8.07372 1.99879 8.34013 1.99879 8.61892ZM1.273 7.49918C1.18449 7.41591 1.08128 7.35017 0.973638 7.29376C1.0812 7.35013 1.18456 7.41597 1.273 7.49918ZM0.972248 5.7549C1.08058 5.69245 1.1835 5.61981 1.26995 5.52947C1.18356 5.61975 1.08051 5.6925 0.972248 5.7549ZM1.71825 5.06103C1.89829 4.87289 1.99879 4.62252 1.99879 4.36211C1.99879 4.62252 1.89829 4.87289 1.71825 5.06103ZM4.1804 2.23381C4.45968 2.23381 4.72652 2.11827 4.91761 1.9146C4.72652 2.11827 4.45968 2.23381 4.1804 2.23381ZM8.32345 1.9146C8.51454 2.11827 8.78138 2.23381 9.06066 2.23381C8.78138 2.23381 8.51454 2.11827 8.32345 1.9146ZM11.2423 4.42229C11.2423 4.70763 11.3629 4.97968 11.5743 5.17131C11.3629 4.97968 11.2423 4.70763 11.2423 4.42229ZM11.5743 7.86775C11.3629 8.05938 11.2423 8.33143 11.2423 8.61677C11.2423 8.33143 11.3629 8.05938 11.5743 7.86775ZM9.06066 10.8052C8.78138 10.8052 8.51454 10.9208 8.32345 11.1245C8.51454 10.9208 8.78138 10.8052 9.06066 10.8052Z"
                    fill={selectedImageIdx === index ? '#589D96' : '#CDCDCD'}
                    fillRule="evenodd"
                  />
                  <path
                    d="M5.4223 1.37667C5.86462 0.905243 6.40382 0.519531 6.62053 0.519531C6.83724 0.519531 7.37644 0.905243 7.81876 1.37667L8.32345 1.9146C8.51454 2.11827 8.78138 2.23381 9.06066 2.23381H9.93243H10.2314C10.7897 2.23381 11.2423 2.6864 11.2423 3.24469V3.5521V4.42229C11.2423 4.70763 11.3629 4.97968 11.5743 5.17131L11.927 5.49096C12.3036 5.8321 12.6117 6.29496 12.6117 6.51953C12.6117 6.7441 12.3036 7.20696 11.927 7.54811L11.5743 7.86775C11.3629 8.05938 11.2423 8.33143 11.2423 8.61677V9.48696V9.79437C11.2423 10.3527 10.7897 10.8052 10.2314 10.8052H9.93243H9.06066C8.78138 10.8052 8.51454 10.9208 8.32345 11.1245L7.81876 11.6624C7.37644 12.1338 6.83724 12.5195 6.62053 12.5195C6.40382 12.5195 5.86462 12.1338 5.4223 11.6624L4.91761 11.1245C4.72652 10.9208 4.45968 10.8052 4.1804 10.8052H3.30863H3.00967C2.45137 10.8052 1.99879 10.3527 1.99879 9.79437V9.49347V8.61892C1.99879 8.34013 1.88365 8.07372 1.68061 7.88268L1.273 7.49918C1.18456 7.41597 1.0812 7.35013 0.973638 7.29376C0.728892 7.1655 0.297243 6.8937 0.279844 6.56479C0.261332 6.21484 0.717133 5.90194 0.972248 5.7549C1.08051 5.6925 1.18356 5.61975 1.26995 5.52947L1.71825 5.06103C1.89829 4.87289 1.99879 4.62252 1.99879 4.36211V3.50068V3.24469C1.99879 2.6864 2.45137 2.23381 3.00967 2.23381H3.30863H4.1804C4.45968 2.23381 4.72652 2.11827 4.91761 1.9146L5.4223 1.37667Z"
                    fill={selectedImageIdx === index ? '#589D96' : '#CDCDCD'}
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
