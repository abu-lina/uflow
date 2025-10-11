'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

const STEPS = [
  {
    title: 'Basics',
    icon: 'mdi:information',
  },
  {
    title: 'Location',
    icon: 'mdi:map-marker',
  },
  {
    title: 'Contact',
    icon: 'mdi:account-group',
  },
  {
    title: 'Media',
    icon: 'mdi:image-multiple',
  },
];

export default function MediaUploadPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const { formData, clearFormData } = useFormData();
  const { user } = useAuth();


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


  // Submit the complete provider creation
  const handleSave = async () => {
    if (!user) {
      console.error('User not authenticated');
      toast.error('Sie müssen angemeldet sein, um einen Anbieter zu erstellen.');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Creating provider with form data:', formData);

      // Upload images if any
      let uploadedUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        console.log('Uploading images...');
        for (const imageFile of formData.images) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `providers/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('provider-images')
            .upload(filePath, imageFile);

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('provider-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }
      }

      // Create provider data
      // Determine which ID field to set based on creation mode
      const isOwner = formData.creationMode === 'owner';
      const insertData = {
        provider_name: formData.title,
        // If online business, all address fields are null
        address_street: formData.isOnlineBusiness ? null : (formData.street || null),
        address_zip: formData.isOnlineBusiness ? null : (formData.zip || null),
        address_city: formData.isOnlineBusiness ? null : (formData.city || null),
        address_country: formData.isOnlineBusiness ? null : (formData.country || null),
        show_address: formData.isOnlineBusiness ? false : (formData.showAddress !== undefined ? formData.showAddress : true),
        category_id: formData.category || null,
        contact_email: formData.email || null,
        contact_phone: formData.phone || null,
        social_website: formData.website || null,
        social_instagram: formData.instagram || null,
        barakah_effects: formData.tags || [],
        // user_created_id: ALWAYS set to track who created this database entry
        // provider_owner_id: Only set in owner mode (when user is the actual business owner)
        user_created_id: user.id,
        provider_owner_id: isOwner ? user.id : null,
        provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
        offers_ids: formData.offers_ids || [],
        needs_ids: formData.needs_ids || [],
      };
      
      console.log('Inserting provider with data:', insertData);
      
      const { error: providerError } = await supabase
        .from('providers')
        .insert([insertData]);
      
      if (providerError) {
        console.error('Error creating provider:', providerError);
        throw providerError;
      }

      console.log('Provider created successfully!');
      
      // Show success message
      toast.success('Anbieter erfolgreich registriert!');
      
      // Clear form data
      clearFormData();
      
      // Redirect to create page
      router.push('/create');
      
    } catch (error) {
      console.error('Error in provider creation:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
      
      if (errorMessage.includes('JWT') || errorMessage.includes('auth') || errorMessage.includes('PGRST301')) {
        toast.error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        setTimeout(() => router.push('/signin'), 2000);
      } else {
        toast.error(`Fehler beim Erstellen: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top transition-all duration-500 ease-in-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.push('/create/contact')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              Media
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={3} steps={STEPS} />
          </div>

          {/* Body */}
          <div className="flex flex-col items-start p-0 gap-8 w-[345px] h-[160px] flex-none order-1 flex-grow-0">
            {/* personalData */}
            <div className="flex flex-col items-start p-0 gap-4 w-[345px] h-[160px] flex-none order-0 self-stretch flex-grow-0">
              {/* Media */}
              <div className="w-[345px] h-6 font-inter-tight font-medium text-xl leading-6 text-[#232323] flex-none order-0 self-stretch flex-grow-0">
                Media
              </div>
              
              {/* input */}
              <div className="flex flex-col items-start p-0 gap-3 w-[345px] h-[120px] flex-none order-1 self-stretch flex-grow-0">
                {/* Account - Navigate to Images */}
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/create/media/images')}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Bilder</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                      {formData.images && formData.images.length > 0 ? `${formData.images.length} Bilder ausgewählt` : 'Bilder hochladen'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>
                </button>

                {/* Spenden-Projekt - Navigate to Social */}
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/create/media/social')}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">Spenden-Projekt</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                      {formData.donationProject || 'Spenden-Projekt auswählen'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Save Button */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              isSubmitting ? 'bg-[#589D96] opacity-50 cursor-not-allowed' : 'bg-[#589D96] opacity-100'
            }`}
            disabled={isSubmitting}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon={isSubmitting ? "lucide:loader-2" : "lucide:save"} />
            <span className="text-base font-medium text-white leading-[19px]">
              {isSubmitting ? 'Erstelle...' : 'Angebot registrieren'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
