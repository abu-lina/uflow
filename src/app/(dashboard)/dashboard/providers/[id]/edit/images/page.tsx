'use client';
/* eslint-disable @next/next/no-img-element */

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';
import { EditSubPageLayout } from '@/components/layout/EditSubPageLayout';
import { useLanguage } from '@/providers/LanguageProvider';
import { ImageCandidatesPanel } from '@/features/admin/components/ImageCandidatesPanel';

export default function EditImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: providerId } = use(params);
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const loadExistingImages = async () => {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('provider_images')
          .eq('provider_id', providerId)
          .single();

        if (!error && data?.provider_images) {
          try {
            const parsed = JSON.parse(data.provider_images);
            // merge so a URL approved before this load resolves is not dropped
            const loaded: string[] = parsed.urls || [];
            setExistingImageUrls((prev) => [...loaded, ...prev.filter((u) => !loaded.includes(u))]);
          } catch (parseError) {
            console.error('Error parsing images:', parseError);
          }
        }
      } catch (error) {
        console.error('Error loading existing images:', error);
      }
    };

    void loadExistingImages();
  }, [providerId]);

  useEffect(() => {
    return () => {
      images.forEach((file) => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, [images]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
    } else {
      setImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const imageFile of images) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }

        const { url } = await res.json();
        uploadedUrls.push(url);
      }

      const allImages = [...existingImageUrls, ...uploadedUrls];
      const imageJson = allImages.length > 0 ? JSON.stringify({ urls: allImages }) : null;

      // Defence-in-depth: normalise to avoid Zod rejection (mirrors saveProviderEdits logic)
      const normaliseProviderImages = (rawImages: string | null): string | undefined => {
        if (!rawImages || rawImages === 'null') return undefined;
        try {
          const parsed = JSON.parse(rawImages);
          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            Array.isArray(parsed.urls)
          ) {
            if (parsed.urls.length === 0) return undefined;
            if (parsed.urls.every((u: unknown) => typeof u === 'string')) return rawImages;
          }
          return undefined;
        } catch {
          return undefined;
        }
      };

      const normalisedImages = normaliseProviderImages(imageJson);
      const requestBody: Record<string, unknown> = { providerId };
      if (normalisedImages !== undefined) {
        requestBody.providerImages = normalisedImages;
      }

      // Update via admin API (bypasses RLS)
      const saveRes = await fetch('/api/admin/edit-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save');
      }

      if (imageJson) {
        localStorage.setItem(`admin_edit_images_${providerId}`, imageJson);
      } else {
        localStorage.removeItem(`admin_edit_images_${providerId}`);
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

  const allDisplayImages = [
    ...existingImageUrls.map((url, index) => ({ type: 'existing' as const, url, index })),
    ...images.map((file, index) => ({ type: 'new' as const, file, index })),
  ];

  return (
    <EditSubPageLayout
      primaryButton={{
        label: isUploading
          ? t('editProvider.editImages.saving')
          : t('editProvider.editImages.save'),
        icon: isUploading ? 'lucide:loader-2' : 'lucide:save',
        onClick: handleSave,
        disabled: isUploading,
        loading: isUploading,
        'aria-label': t('editProvider.editImages.saveAria'),
      }}
      title={t('editProvider.editImages.title')}
    >
      <div className="flex w-full flex-col gap-4">
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

      <ImageCandidatesPanel
        providerId={providerId}
        onApproved={(url) =>
          setExistingImageUrls((prev) => (prev.includes(url) ? prev : [...prev, url]))
        }
      />

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
              const imageUrl = item.type === 'existing' ? item.url : URL.createObjectURL(item.file);
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

      {allDisplayImages.length === 0 && (
        <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-4">
          <Icon className="h-16 w-16 text-gray-300" icon="lucide:image" />
          <div className="text-center">
            <p className="mb-2 text-sm text-gray-500">
              {t('editProvider.editImages.noImagesSelected')}
            </p>
            <p className="text-xs text-gray-400">{t('editProvider.editImages.clickToUpload')}</p>
          </div>
        </div>
      )}
    </EditSubPageLayout>
  );
}
