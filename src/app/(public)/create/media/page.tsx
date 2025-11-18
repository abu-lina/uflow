'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { toast } from 'sonner';
import { FooterAction } from '@/components/ui/FooterAction';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { createProviderCommunityServiceRelationship } from '@/services/communityServices';
import { useLanguage } from '@/providers/LanguageProvider';

export default function MediaUploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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


  // Show loading state while form data is being restored
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('create.media.loadingFormData')}</p>
        </div>
      </div>
    );
  }

  // Submit the complete entity creation (provider or community service)
  const handleSave = async () => {
    if (!user) {
      console.error('User not authenticated');
      toast.error(t('create.media.mustBeLoggedIn'));
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

        
        toast.success(t('create.media.communityServiceCreated'));
        
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
        
        toast.success(t('create.media.providerCreated'));
      }

      // Clear form data and redirect
      clearFormData();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });
      
      router.push('/providers');
      
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error(t('create.media.errorCreating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.media.title')}
        variant="back-and-title"
        onBack="/create/contact"
      />

      <PageContent maxWidth="full">
        <div className="flex w-full flex-1 flex-col gap-8">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={3} steps={STEPS} />
          </div>


          {/* Body */}
          <div className="flex flex-col items-start p-0 gap-8 w-full flex-none order-1 flex-grow-0">
            {/* personalData */}
            <div className="flex flex-col items-start p-0 gap-4 w-full flex-none order-0 self-stretch flex-grow-0">
              {/* input */}
              <div className="flex flex-col items-start p-0 gap-3 w-full flex-none order-1 self-stretch flex-grow-0">
                {/* Account - Navigate to Images */}
                <button
                  className="flex w-full min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm hover:bg-gray-50 transition-colors"
                  onClick={() => router.push('/create/media/images')}
                >
                  <div className="flex flex-1 flex-col gap-1 items-start">
                    <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.media.images')}</span>
                    <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                      {formData.images && formData.images.length > 0 
                        ? t('create.media.imagesSelected').replace('{{count}}', formData.images.length.toString())
                        : t('create.media.uploadImages')}
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
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">{t('create.media.socialInitiatives')}</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {(formData.selectedCommunityServiceIds || []).length > 0 
                          ? t('create.media.initiativesSelected').replace('{{count}}', (formData.selectedCommunityServiceIds || []).length.toString())
                          : t('create.media.selectInitiatives')}
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
      </PageContent>

      <FooterAction
        actionButton={{
          label: isSubmitting 
                ? t('create.media.creating')
                : isCommunityService 
                  ? t('create.media.registerCommunityService')
              : t('create.media.registerProvider'),
          icon: isSubmitting ? 'lucide:loader-2' : 'lucide:save',
          onClick: handleSave,
          disabled: isSubmitting,
          loading: isSubmitting,
          loadingText: t('create.media.creating'),
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}