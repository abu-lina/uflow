'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { createProviderCommunityServiceRelationship } from '@/services/community_services';
import { useLanguage } from '@/providers/LanguageProvider';

export default function MediaUploadPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, clearFormData, isLoading } = useFormData();
  const { user } = useAuth();
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
      icon: 'mdi:account-group',
    },
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

  // Simple entity type determination based on category
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

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

  // Show loading state while form data is being restored
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#589D96] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  // Submit the complete entity creation (provider or community service)
  const handleSave = async () => {
    if (!user) {
      console.error('User not authenticated');
      toast.error('Sie müssen angemeldet sein, um einen Eintrag zu erstellen.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload images if any
      let uploadedUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        
        // Use separate buckets for better organization
        const bucketName = isCommunityService ? 'community-service-images' : 'provider-images';
        const folderName = isCommunityService ? 'community-services' : 'providers';
        
        for (const imageFile of formData.images) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${folderName}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, imageFile);

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }
      }

      // Determine which ID field to set based on creation mode
      const isOwner = formData.creationMode === 'owner';

      if (isCommunityService) {
        // Create community service
        const insertData = {
          community_service_name: formData.title,
          community_service_description: formData.description || null,
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
          user_created_id: user.id,
          provider_id: isOwner ? user.id : null,
          community_service_images: uploadedUrls.length > 0 ? uploadedUrls : null,
          offers_ids: formData.offers_ids || [],
          needs_ids: formData.needs_ids || [],
          review_status: 'approved' as const, // Community services are auto-approved
        };
        
        
        const { data: createdService, error: serviceError } = await supabase
          .from('community_services')
          .insert([insertData])
          .select('community_service_id')
          .single();
        
        if (serviceError) {
          console.error('Error creating community service:', serviceError);
          throw serviceError;
        }

        if (!createdService) {
          throw new Error('Community service created but no data returned');
        }

        
        toast.success('Gemeinschaftsdienst erfolgreich erstellt!');
        
      } else {
        // Create provider
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
        
        
        const { data: createdProvider, error: providerError } = await supabase
          .from('providers')
          .insert([insertData])
          .select('provider_id')
          .single();
        
        if (providerError) {
          console.error('Error creating provider:', providerError);
          throw providerError;
        }

        if (!createdProvider) {
          throw new Error('Provider created but no data returned');
        }

        // Create provider-community service relationships for all selected services
        if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
          for (const serviceId of formData.selectedCommunityServiceIds) {
            const { error: relationshipError } = await createProviderCommunityServiceRelationship(
              createdProvider.provider_id,
              serviceId
            );
            
            if (relationshipError) {
              console.error('Error creating relationship:', relationshipError);
              // Don't throw here - the provider was created successfully
            }
          }
        }
        
        toast.success('Anbieter erfolgreich erstellt!');
      }

      // Clear form data and redirect
      clearFormData();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });
      
      router.push('/providers');
      
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error('Fehler beim Erstellen. Bitte versuchen Sie es erneut.');
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
            onClick={() => router.back()}
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

                {/* Spenden-Projekt - Navigate to Social (only for providers) */}
                {!isCommunityService && (
                  <button
                    className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
                    onClick={() => router.push('/create/media/social')}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Soziale Initiativen</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {(formData.selectedCommunityServiceIds || []).length > 0 
                          ? `${(formData.selectedCommunityServiceIds || []).length} Initiativen ausgewählt` 
                          : 'Initiativen auswählen'}
                      </div>
                    </div>
                    <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                      <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                    </div>
                  </button>
                )}
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
              {isSubmitting ? 'Erstelle...' : `${isCommunityService ? 'Gemeinschaftsdienst' : 'Angebot'} registrieren`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}