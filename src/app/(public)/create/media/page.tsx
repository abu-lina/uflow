'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { toast } from 'sonner';
import { FooterAction } from '@/components/ui/FooterAction';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/providers/auth-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { createProviderOrService } from '@/services/providerService';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function MediaUploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, clearFormData, isLoading } = useFormData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  // Steps with translations - only used in owner mode (recommendation mode redirects)
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
      title: 'Halal',
      icon: 'mdi:check-decagram',
    },
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

  // Simple entity type determination based on category
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

  // In recommendation mode, redirect to contact page (media step is skipped)
  const isRecommendationMode = formData.creationMode === 'recommendation';

  // Show loading state while form data is being restored
  if (isLoading) {
    return (
      <div className="flex h-screen-fix items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('create.media.loadingFormData')}</p>
        </div>
      </div>
    );
  }

  // Redirect guard: If in recommendation mode, redirect to contact page
  // The contact page will handle submission directly
  if (isRecommendationMode) {
    router.replace('/create/contact');
    return (
      <div className="flex h-screen-fix items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Submit the complete entity creation (provider or community service)
  // Note: This is only used in owner mode (recommendation mode redirects away)
  const handleSave = async () => {
    if (!user) {
      console.error('User not authenticated');
      toast.error(t('create.media.mustBeLoggedIn'));
      return;
    }

    try {
      setIsSubmitting(true);

      // Use the shared service function
      await createProviderOrService(
        formData,
        user,
        false // isRecommendationMode = false (owner mode)
      );

      // Show success message
      if (isCommunityService) {
        toast.success(t('create.media.communityServiceCreated'));
      } else {
        toast.success(t('create.media.providerCreated'));
      }

      // Clear form data and redirect
      clearFormData();
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });
      
      // Redirect to providers page
      router.push('/providers');
      
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error(t('create.media.errorCreating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title={t('create.media.title')}
        variant="back-and-title"
        onBack="/create/halal"
      />

      <PageContent 
        className={cn(
          !isMobile && 'max-w-2xl lg:max-w-4xl mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <div className="flex w-full flex-1 flex-col gap-8">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={4} steps={STEPS} />
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
    </Layout>
  );
}