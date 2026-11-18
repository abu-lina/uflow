'use client';
/* eslint-disable @next/next/no-img-element */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';

export default function EditImagesPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  // Load existing images from provider
  useEffect(() => {
    const loadExistingImages = async () => {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('provider_images')
          .eq('provider_id', resolvedParams.provider_id)
          .single();

        if (!error && data?.provider_images) {
          try {
            const parsed = JSON.parse(data.provider_images);
            setExistingImageUrls(parsed.urls || []);
          } catch (parseError) {
            console.error('Error parsing images:', parseError);
          }
        }
      } catch (error) {
        console.error('Error loading existing images:', error);
      }
    };

    void loadExistingImages();
  }, [resolvedParams.provider_id]);

  // Cleanup blob URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      // Clean up all blob URLs to prevent memory leaks
      images.forEach((file) => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, [images]);

  // Handle new image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  // Remove image from selection
  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      setImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Save images
  const handleSave = async () => {
    setIsUploading(true);
    try {
      // Upload new images if any
      const uploadedUrls: string[] = [];

      for (const imageFile of images) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `providers/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('provider-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('provider-images').getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Combine existing and new images
      const allImages = [...existingImageUrls, ...uploadedUrls];

      // Update provider with new image URLs
      const imageJson = allImages.length > 0 ? JSON.stringify({ urls: allImages }) : null;

      const { error } = await supabase
        .from('providers')
        .update({
          provider_images: imageJson,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', resolvedParams.provider_id);

      if (error) throw error;

      // Update localStorage for form
      if (imageJson) {
        localStorage.setItem(`edit_images_${resolvedParams.provider_id}`, imageJson);
      } else {
        localStorage.removeItem(`edit_images_${resolvedParams.provider_id}`);
      }

      toast.success(t('editProvider.editImages.success'));
      router.back();
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error(t('editProvider.editImages.error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Combine all images for display
  const allDisplayImages = [
    ...existingImageUrls.map((url, index) => ({ type: 'existing' as const, url, index })),
    ...images.map((file, index) => ({ type: 'new' as const, file, index })),
  ];

  return (
    <div className="h-screen-fix flex flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      <PageHeader
        title={t('editProvider.editImages.title')}
        variant="back-and-title"
        onBack={() => router.back()}
      />
      <HeaderSpacer />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-safe-24 w-full pb-24 pt-8">
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
                    {t('editProvider.editImages.uploadButton')}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Selected Images */}
          {allDisplayImages.length > 0 && (
            <div className="mt-8 flex w-full flex-col gap-4">
              <h3 className="text-sm font-medium text-[#232323]">
                {t('editProvider.editImages.selectedImages').replace(
                  '{{count}}',
                  allDisplayImages.length.toString(),
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {allDisplayImages.map((item, idx) => {
                  const imageUrl =
                    item.type === 'existing' ? item.url : URL.createObjectURL(item.file);
                  return (
                    <div
                      key={idx}
                      className="relative h-[160px] w-full overflow-hidden rounded-[12px] bg-gray-100"
                    >
                      <img
                        alt={`Preview ${idx + 1}`}
                        className="h-full w-full object-cover"
                        src={imageUrl}
                        onError={(e) => {
                          console.error('Error loading image preview:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log(
                            'Image loaded successfully:',
                            item.type === 'existing' ? 'existing image' : item.file.name,
                          );
                        }}
                      />
                      <button
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#CDCDCD] bg-white/70 backdrop-blur-[1.25px]"
                        type="button"
                        onClick={() => {
                          // Clean up blob URL if it's a new file
                          if (item.type === 'new') {
                            URL.revokeObjectURL(imageUrl);
                          }
                          removeImage(item.index, item.type === 'existing');
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
          {allDisplayImages.length === 0 && (
            <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-4">
              <Icon className="h-16 w-16 text-gray-300" icon="lucide:image" />
              <div className="text-center">
                <p className="mb-2 text-sm text-gray-500">
                  {t('editProvider.editImages.noImagesSelected')}
                </p>
                <p className="text-xs text-gray-400">
                  {t('editProvider.editImages.clickToUpload')}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Save Button */}
      <FooterAction
        actionButton={{
          label: isUploading
            ? t('editProvider.editImages.saving')
            : t('editProvider.editImages.save'),
          icon: isUploading ? 'lucide:loader-2' : 'lucide:save',
          onClick: handleSave,
          variant: 'primary',
          disabled: isUploading,
          loading: isUploading,
          'aria-label': t('editProvider.editImages.saveAria'),
        }}
      />
    </div>
  );
}
