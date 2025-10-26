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
    icon: 'mdi:phone',
  },
  {
    title: 'Offers',
    icon: 'mdi:handshake',
  },
  {
    title: 'Needs',
    icon: 'mdi:help-circle',
  },
  {
    title: 'Media',
    icon: 'mdi:image-multiple',
  },
];

export default function MediaUploadPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, clearFormData } = useFormData();
  const { user } = useAuth();

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollContainer = scrollContainerRef.current;
      
      if (scrollContainer) {
        const containerScrollTop = scrollContainer.scrollTop;
        setIsHeaderSticky(containerScrollTop <= 10);
      } else {
        setIsHeaderSticky(currentScrollY <= 10);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainerRef.current = scrollContainer;
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Auto-save timer
  useEffect(() => {
    const timer = setTimeout(() => {
      // Auto-save logic can be added here
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Submit the complete entity creation (provider or community service)
  const handleSave = async () => {
    if (!user) {
      console.error('User not authenticated');
      toast.error('Sie müssen angemeldet sein, um einen Eintrag zu erstellen.');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Creating entity with form data:', formData);

      // Upload images if any
      let uploadedUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        console.log('Uploading images...');
        
        // Use separate buckets for better organization
        const bucketName = formData.entityType === 'community_service' ? 'community-service-images' : 'provider-images';
        const folderName = formData.entityType === 'community_service' ? 'community-services' : 'providers';
        
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

      if (formData.entityType === 'community_service') {
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
        
        console.log('Inserting community service with data:', insertData);
        
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

        console.log('Community service created successfully with ID:', createdService.community_service_id);
        
        toast.success('Gemeinschaftsdienst erfolgreich erstellt!');
        
      } else {
        // Create provider (existing logic)
        const insertData = {
          provider_name: formData.title,
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
          provider_owner_id: isOwner ? user.id : null,
          provider_images: uploadedUrls.length > 0 ? JSON.stringify({ urls: uploadedUrls }) : null,
          offers_ids: formData.offers_ids || [],
          needs_ids: formData.needs_ids || [],
        };
        
        console.log('Inserting provider with data:', insertData);
        
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

        console.log('Provider created successfully with ID:', createdProvider.provider_id);

        // Create provider-community service relationships for all selected services
        if (formData.selectedCommunityServiceIds && formData.selectedCommunityServiceIds.length > 0) {
          console.log('Creating provider-community service relationships...');
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
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <div className={`relative z-10 bg-white/10 backdrop-blur-3xl transition-all duration-300 ${isHeaderSticky ? 'pt-[calc(env(safe-area-inset-top)+24px)]' : 'pt-6'}`}>
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
              onClick={() => router.back()}
            >
              <Icon className="text-white" height={20} icon="mdi:arrow-left" width={20} />
            </button>
            <h1 className="text-lg font-semibold text-white">Medien</h1>
            <div className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-6">
          {/* Step Indicator */}
          <StepIndicator currentStep={5} steps={STEPS} />

          {/* Media Upload Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {formData.entityType === 'community_service' ? 'Gemeinschaftsdienst' : 'Anbieter'} Medien
              </h2>
              <p className="text-sm text-gray-600">
                Fügen Sie Bilder hinzu, um Ihren {formData.entityType === 'community_service' ? 'Gemeinschaftsdienst' : 'Anbieter'} zu präsentieren
              </p>
            </div>

            {/* Image Upload Area */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <Icon className="mx-auto mb-4 text-gray-400" height={48} icon="mdi:image-plus" width={48} />
              <p className="text-sm text-gray-600">
                Bilder hierher ziehen oder klicken zum Auswählen
              </p>
              <input
                multiple
                accept="image/*"
                className="hidden"
                id="image-upload"
                type="file"
              />
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      alt={`Uploaded image ${index + 1}`}
                      className="h-32 w-full rounded-lg object-cover"
                      src={url}
                    />
                    <button
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"
                      onClick={() => {
                        const newImages = uploadedImages.filter((_, i) => i !== index);
                        setUploadedImages(newImages);
                      }}
                    >
                      <Icon height={16} icon="mdi:close" width={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Services Selection (only for providers) */}
          {formData.entityType === 'provider' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Gemeinschaftsdienste</h3>
              <p className="text-sm text-gray-600">
                Wählen Sie Gemeinschaftsdienste aus, die Sie unterstützen möchten
              </p>
              {/* Community services selection logic would go here */}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-gray-200 bg-white p-6">
        <button
          className="w-full rounded-xl bg-[#589D96] px-6 py-3 text-white font-semibold transition-colors hover:bg-teal-600 disabled:opacity-50"
          disabled={isSubmitting}
          onClick={handleSave}
        >
          {isSubmitting ? 'Erstelle...' : `${formData.entityType === 'community_service' ? 'Gemeinschaftsdienst' : 'Anbieter'} erstellen`}
        </button>
      </div>
    </div>
  );
}
