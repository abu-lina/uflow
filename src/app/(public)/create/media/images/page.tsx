'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';
import { FooterAction } from '@/components/ui/FooterAction';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ImageUploadPage() {
  
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
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.media.uploadImages')}
        variant="back-and-title"
        onBack="/create/media"
      />

      <PageContent maxWidth="full">
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
      </PageContent>

      <FooterAction
        actionButton={{
          label: t('actions.save'),
          icon: 'lucide:save',
          onClick: handleSave,
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}
