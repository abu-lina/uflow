'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ImageUploadPage() {
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all blob URLs to prevent memory leaks
      formData.images.forEach((file) => {
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
    // Images are already saved in formData via updateFormData
    // The form provider automatically persists to localStorage
    router.push('/create/media');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        className={cn('md:top-20 md:z-[100] [&>div]:md:max-w-full [&>div]:md:px-0')}
        title={t('create.media.uploadImages')}
        variant="back-and-title"
        onBack="/create/basics"
      />

      <PageContent
        hasFooter
        className={cn('flex flex-col gap-8', 'sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8')}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        {/* Image Upload Section */}
        <div className="flex w-full flex-col gap-4">
          {/* Upload Button */}
          <div className="relative">
            <input
              multiple
              accept="image/*"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              type="file"
              onChange={handleImageUpload}
            />
            <button
              className="flex h-[54px] w-full flex-col items-start justify-center gap-4 rounded-[12px] border border-[#D4D4D4] bg-white p-4 hover:bg-gray-50"
              type="button"
            >
              <div className="flex h-6 w-full flex-row items-center gap-3 p-0">
                <Icon className="h-6 w-6 text-[#232323]" icon="lucide:image-up" />
                <span className="font-inter-tight text-base font-semibold leading-[19px] text-[#232323]">
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
                  <div
                    key={index}
                    className="relative h-[160px] w-full overflow-hidden rounded-[12px] bg-gray-100"
                  >
                    <img
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
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
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#CDCDCD] bg-white/80 backdrop-blur-sm transition-colors hover:bg-white"
                      type="button"
                      onClick={() => {
                        // Clean up the blob URL to prevent memory leaks
                        URL.revokeObjectURL(imageUrl);
                        removeImage(index);
                      }}
                    >
                      <Icon
                        className="h-4 w-4 text-[#232323]"
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
              <p className="mb-2 text-sm text-gray-500">{t('create.media.noImagesSelected')}</p>
              <p className="text-xs text-gray-400">{t('create.media.clickToUpload')}</p>
            </div>
          </div>
        )}

        {/* Desktop Save Button */}
        {/* Desktop only */}
        <div className="hidden sm:block">
          <div className="flex flex-col gap-3 pt-4">
            <Button fullWidth icon="lucide:save" variant="primary" onClick={handleSave}>
              {t('actions.save')}
            </Button>
          </div>
        </div>
      </PageContent>

      {/* Mobile Footer Action */}
      {/* Mobile only */}
      <div className="sm:hidden">
        <FooterAction
          actionButton={{
            label: t('actions.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            variant: 'primary',
          }}
        />
      </div>
    </ScrollablePageLayout>
  );
}
