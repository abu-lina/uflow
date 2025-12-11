'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ImageUploadPage() {
  
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

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
    // Images are already saved in formData via updateFormData
    // The form provider automatically persists to localStorage
    router.push('/create/media');
  };

  const handleBack = () => {
    router.push('/create/basics');
  };

  return (
    <Layout>
      <PageHeader
        className={cn(
          !isMobile && 'md:top-20 md:z-[100] [&>div]:md:px-0 [&>div]:md:max-w-full'
        )}
        customContent={
          !isMobile ? (
            <div className="w-full max-w-[640px] mx-auto px-6 md:px-8 flex items-center h-header-height-mobile sm:h-header-height-tablet">
              <button
                aria-label="Zurück"
                className="flex items-center justify-center w-8 h-8 -ml-1"
                onClick={handleBack}
              >
                <Icon 
                  className="w-8 h-8 text-content-heading pointer-events-none" 
                  icon="material-symbols:chevron-left" 
                />
              </button>
              <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
                {t('create.media.uploadImages')}
              </h1>
            </div>
          ) : undefined
        }
        title={t('create.media.uploadImages')}
        variant="back-and-title"
        onBack={isMobile ? "/create/basics" : undefined}
      />

      <PageContent 
        className={cn(
          'flex flex-col gap-8',
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        hasFooter={isMobile}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
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

        {/* Desktop Save Button */}
        {!isMobile && (
          <div className="flex flex-col gap-3 pt-4">
            <Button
              fullWidth
              icon="lucide:save"
              variant="primary"
              onClick={handleSave}
            >
              {t('actions.save')}
            </Button>
          </div>
        )}
      </PageContent>

      {/* Mobile Footer Action */}
      {isMobile && (
        <FooterAction
          actionButton={{
            label: t('actions.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            variant: 'primary',
          }}
        />
      )}
    </Layout>
  );
}
