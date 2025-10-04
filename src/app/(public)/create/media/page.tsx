'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { Icon } from '@iconify/react';

export default function MediaUploadPage() {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load selected images from localStorage
  useEffect(() => {
    const savedImages = localStorage.getItem('providerImages');
    if (savedImages) {
      try {
        const imageData = JSON.parse(savedImages);
        // Convert base64 strings back to File objects
        const files = imageData.map((img: { name: string; data: string; type: string }) => {
          const byteCharacters = atob(img.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          return new File([byteArray], img.name, { type: img.type });
        });
        setSelectedImages(files);
      } catch (error) {
        console.error('Error loading images from localStorage:', error);
      }
    }
  }, []);

  // Scroll detection for sticky header
  useEffect(() => {
    const contentContainer = document.querySelector('.content-scroll-container');
    
    const handleScroll = () => {
      const currentScrollY = contentContainer?.scrollTop || 0;
      const scrollDifference = currentScrollY - lastScrollY.current;
      
      // Always show if at top
      if (currentScrollY <= 100) {
        setIsHeaderSticky(true);
      }
      // Show when scrolling up past 100px
      else if (currentScrollY > 100 && scrollDifference < 0) {
        setIsHeaderSticky(true);
      }
      // Hide when scrolling down past 100px
      else if (currentScrollY > 100 && scrollDifference > 0) {
        setIsHeaderSticky(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    if (contentContainer) {
      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isHeaderSticky]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages = Array.from(files);
      setSelectedImages(prev => {
        const updatedImages = [...prev, ...newImages];
        // Save to localStorage
        saveImagesToLocalStorage(updatedImages);
        return updatedImages;
      });
    }
  };

  // Save images to localStorage
  const saveImagesToLocalStorage = (images: File[]) => {
    const imageData = images.map(file => ({
      name: file.name,
      type: file.type,
      data: '' // Will be filled by converting to base64
    }));

    // Convert files to base64 and save
    Promise.all(images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    })).then(base64Data => {
      const imageDataWithBase64 = imageData.map((img, index) => ({
        ...img,
        data: base64Data[index]
      }));
      localStorage.setItem('providerImages', JSON.stringify(imageDataWithBase64));
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages(prev => {
      const updatedImages = prev.filter((_, i) => i !== index);
      // Save to localStorage
      saveImagesToLocalStorage(updatedImages);
      return updatedImages;
    });
  };

  // Save selected images and return to create page with all form data preserved
  const handleSave = () => {
    const params = new URLSearchParams();
    
    // Preserve all existing form data from URL
    const existingParams = ['title', 'description', 'street', 'zip', 'city', 'country', 'showAddress', 'website', 'instagram', 'phone', 'email', 'categoryId', 'offersIds', 'needsIds'];
    existingParams.forEach(param => {
      const value = searchParams?.get(param);
      if (value) params.set(param, value);
    });
    
    // Add the selected images count
    params.set('images', selectedImages.length.toString());
    
    // Set step to 3 (Media step) so user returns to the correct step
    params.set('step', '3');
    
    router.push(`/create?${params.toString()}`);
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-transform duration-300 ${
        isHeaderSticky ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => {
              const params = new URLSearchParams();
              // Preserve all existing form data
              const formParams = ['title', 'description', 'street', 'zip', 'city', 'country', 'showAddress', 'website', 'instagram', 'phone', 'email', 'categoryId', 'offersIds', 'needsIds'];
              formParams.forEach(param => {
                const value = searchParams.get(param);
                if (value) params.set(param, value);
              });
              // Add current images count
              params.set('images', selectedImages.length.toString());
              // Set step to 3 (Media step) so user returns to the correct step
              params.set('step', '3');
              
              console.log('Media page back button - preserving params:', {
                originalParams: Object.fromEntries(searchParams.entries()),
                newParams: Object.fromEntries(params.entries())
              });
              
              router.push(`/create?${params.toString()}`);
            }}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-[#232323] leading-[29px]">
              Bilder hochladen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-24">
          {/* Upload Section */}
          <div className="flex w-full flex-col gap-2">
            <h3 className="text-sm font-medium text-[#232323]">Bilder auswählen</h3>
            <div className="relative">
              <input
                multiple
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                type="file"
                onChange={handleImageUpload}
              />
              <button
                className="flex w-full h-[54px] flex-col justify-center items-start p-4 gap-4 bg-white border border-[#D4D4D4] rounded-[12px]"
                type="button"
              >
                <div className="flex flex-row items-center p-0 gap-3 w-full h-6">
                  <Icon 
                    className="w-6 h-6 text-[#232323]" 
                    icon="lucide:image-up" 
                  />
                  <span className="w-[121px] h-[19px] font-['Inter_Tight'] font-normal font-semibold text-base leading-[19px] flex items-center text-[#232323]">
                    Bilder hochladen
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Selected Images */}
          {selectedImages.length > 0 && (
            <div className="flex-1 w-full">
              <h3 className="mb-4 text-sm font-medium text-[#232323]">
                Ausgewählte Bilder ({selectedImages.length})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative w-[160px] h-[160px] rounded-[11.0585px]">
                    <Image
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full rounded-[11.0585px] object-cover"
                      height={160}
                      src={URL.createObjectURL(file)}
                      width={160}
                    />
                    <button
                      className="absolute top-2 right-2 flex items-center justify-center w-[27px] h-[27px] bg-white/70 border border-[#CDCDCD] backdrop-blur-[2.25078px] rounded-[6.75px] hover:bg-white/80 transition-colors"
                      type="button"
                      onClick={() => removeImage(index)}
                    >
                      <Icon 
                        className="w-[18px] h-[18px] text-[#232323]" 
                        icon="material-symbols:close-rounded" 
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedImages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Icon className="mx-auto mb-4 h-16 w-16 text-gray-300" icon="lucide:image" />
                <p className="text-sm text-gray-500">
                  Noch keine Bilder ausgewählt
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Klicke auf &quot;Bilder hochladen&quot; um zu beginnen
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className="flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity bg-[#589D96] opacity-100"
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:user-plus" />
            <span className="text-base font-medium text-white leading-[19px]">
              Anbieter registrieren ({selectedImages.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
