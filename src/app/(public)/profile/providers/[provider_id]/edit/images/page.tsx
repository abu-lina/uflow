'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';

export default function EditImagesPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

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

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all blob URLs to prevent memory leaks
      images.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Handle new image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      setImages(prev => [...prev, ...newImages]);
    }
  };

  // Remove image from selection
  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
    } else {
      setImages(prev => prev.filter((_, i) => i !== index));
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

        const { data: { publicUrl } } = supabase.storage
          .from('provider-images')
          .getPublicUrl(fileName);

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

      toast.success('Bilder erfolgreich aktualisiert!');
      router.back();
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Fehler beim Speichern der Bilder');
    } finally {
      setIsUploading(false);
    }
  };

  // Combine all images for display
  const allDisplayImages = [
    ...existingImageUrls.map((url, index) => ({ type: 'existing' as const, url, index })),
    ...images.map((file, index) => ({ type: 'new' as const, file, index }))
  ];

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-title">Bilder hochladen</h1>
        </div>
      </header>

      {/* Dynamic Spacer */}
      <div className="h-[calc(env(safe-area-inset-top)+24px+40px)]" />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-8 pb-24">
          
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
                    Bilder hochladen
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Selected Images */}
          {allDisplayImages.length > 0 && (
            <div className="flex w-full flex-col gap-4 mt-8">
              <h3 className="text-sm font-medium text-[#232323]">
                Ausgewählte Bilder ({allDisplayImages.length})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {allDisplayImages.map((item, idx) => {
                  const imageUrl = item.type === 'existing' ? item.url : URL.createObjectURL(item.file);
                  return (
                    <div key={idx} className="relative w-full h-[160px] rounded-[12px] overflow-hidden bg-gray-100">
                      <img
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        src={imageUrl}
                        onError={(e) => {
                          console.error('Error loading image preview:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', item.type === 'existing' ? 'existing image' : item.file.name);
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
          {allDisplayImages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 mt-12">
              <Icon className="h-16 w-16 text-gray-300" icon="lucide:image" />
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Noch keine Bilder ausgewählt
                </p>
                <p className="text-xs text-gray-400">
                  Klicke auf &quot;Bilder hochladen&quot; um zu beginnen
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
          <button
            className="flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity bg-[#589D96] opacity-100 disabled:opacity-50"
            disabled={isUploading}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon={isUploading ? "lucide:loader-2" : "lucide:save"} />
            <span className="text-base font-medium text-white leading-[19px]">
              {isUploading ? 'Speichern...' : 'Speichern'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
