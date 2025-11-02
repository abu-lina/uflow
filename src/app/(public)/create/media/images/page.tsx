'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ImageUploadPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Steps with translations
  const STEPS = [
    {
      title: t('create.steps.basics'),
      icon: 'mdi:information',
    },
    {
      title: t('create.steps.location'),
      icon: 'mdi:map-marker',
    },
    {
      title: t('create.steps.contact'),
      icon: 'mdi:account',
    },
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all blob URLs to prevent memory leaks
      formData.images.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, [formData.images]);

  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      updateFormData({ images: [...formData.images, ...newImages] });
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    updateFormData({ images: updatedImages });
  };

  // Save and continue
  const handleSave = () => {
    router.push('/create/media/social');
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader
        isVisible={isHeaderSticky}
        title={t('create.media.uploadImages')}
        variant="back-and-title"
        onBack="/create/media"
      />
      <HeaderSpacer isVisible={isHeaderSticky} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-safe-24 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full flex-1 flex-col gap-8">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={3} steps={STEPS} />
          </div>

          {/* Image Upload Section */}
          <div className="flex w-full flex-col gap-4">
            
            {/* Upload Button */}
            <div className="relative">
              <input
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                type="file"
                onChange={handleImageUpload}
              />
              <button
                className="flex w-full h-[54px] flex-col justify-center items-start p-4 gap-4 bg-white border border-[#D4D4D4] rounded-[12px] hover:bg-gray-50"
                type="button"
              >
                <div className="flex flex-row items-center p-0 gap-3 w-full h-6">
                  <Icon 
                    className="w-6 h-6 text-[#232323]" 
                    icon="lucide:image-up" 
                  />
                  <span className="font-inter-tight font-semibold text-base leading-[19px] text-[#232323]">
                    {t('create.media.uploadImages')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Selected Images */}
          {formData.images.length > 0 && (
            <div className="flex w-full flex-col gap-4">
              <h3 className="text-sm font-medium text-[#232323]">
                {t('create.media.selectedImages')} ({formData.images.length})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {formData.images.map((file, index) => {
                  const imageUrl = URL.createObjectURL(file);
                  return (
                    <div key={index} className="relative w-full h-[160px] rounded-[12px] overflow-hidden bg-gray-100">
                      <img
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        src={imageUrl}
                        onError={(e) => {
                          console.error('Error loading image preview:', e);
                          // Fallback to a placeholder if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', file.name);
                        }}
                      />
                      <button
                        className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 bg-white/80 border border-[#CDCDCD] backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                        type="button"
                        onClick={() => {
                          // Clean up the blob URL to prevent memory leaks
                          URL.revokeObjectURL(imageUrl);
                          removeImage(index);
                        }}
                      >
                        <Icon 
                          className="w-4 h-4 text-[#232323]" 
                          icon="material-symbols:close-rounded" 
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {formData.images.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Icon className="h-16 w-16 text-gray-300" icon="lucide:image" />
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  {t('create.media.noImagesSelected')}
                </p>
                <p className="text-xs text-gray-400">
                  {t('create.media.clickToUpload')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-safe-24 pb-4">
          <button
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity bg-[#589D96] opacity-100"
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              {t('actions.save')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
