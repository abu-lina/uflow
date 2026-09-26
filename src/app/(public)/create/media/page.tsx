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
import { createProviderOrService } from '@/features/providers/services/mutations';
import {
  ownerSubmissionSchema,
  submissionFieldLabelKeys,
  firstIssueField,
} from '@/lib/validations/submissionSchemas';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function MediaUploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData, clearFormData, isLoading } = useFormData();
  const { user } = useAuth();
  const { t } = useLanguage();

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
      <div className="h-screen-fix flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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
      <div className="h-screen-fix flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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

    // AC5.2/5.3: validate the owner required set and name the missing field.
    const parsed = ownerSubmissionSchema.safeParse(formData);
    if (!parsed.success) {
      const issueField = firstIssueField(parsed.error);
      const labelKey = submissionFieldLabelKeys[issueField];
      toast.error(
        t('submissionValidation.fieldRequired', { field: labelKey ? t(labelKey) : issueField }),
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Use the shared service function
      await createProviderOrService(
        formData,
        user,
        false, // isRecommendationMode = false (owner mode)
      );

      // Show success message; the submission is pending review, not live yet.
      toast.success(t('submissionStatus.submittedToast'));

      // Clear form data and redirect
      clearFormData();

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      // Redirect to food page
      router.push('/food');
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error(t('create.media.errorCreating'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollablePageLayout>
      <PageHeader title={t('create.media.title')} variant="back-and-title" onBack="/create/halal" />

      <PageContent
        className={cn('sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl')}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <div className="flex w-full flex-1 flex-col gap-8">
          {/* Step Indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={4} steps={STEPS} />
          </div>

          {/* Body */}
          <div className="order-1 flex w-full flex-none flex-grow-0 flex-col items-start gap-8 p-0">
            {/* personalData */}
            <div className="order-0 flex w-full flex-none flex-grow-0 flex-col items-start gap-4 self-stretch p-0">
              {/* input */}
              <div className="order-1 flex w-full flex-none flex-grow-0 flex-col items-start gap-3 self-stretch p-0">
                {/* Account - Navigate to Images */}
                <button
                  className="flex min-h-[54px] w-full rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                  onClick={() => router.push('/create/media/images')}
                >
                  <div className="flex flex-1 flex-col items-start gap-1">
                    <span className="text-xs font-normal leading-[15px] text-[#999999]">
                      {t('create.media.images')} *
                    </span>
                    <div className="break-words text-left text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727]">
                      {formData.images && formData.images.length > 0
                        ? t('create.media.imagesSelected').replace(
                            '{{count}}',
                            formData.images.length.toString(),
                          )
                        : t('create.media.uploadImages')}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 items-center justify-center self-center">
                    <Icon
                      className="h-6 w-6 text-[#232323]"
                      icon="material-symbols:chevron-right"
                    />
                  </div>
                </button>

                {/* Spenden-Projekt - Navigate to Social (only for providers) */}
                {!isCommunityService && (
                  <button
                    className="flex min-h-[54px] w-full rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm transition-colors hover:bg-gray-50"
                    onClick={() => router.push('/create/media/social')}
                  >
                    <div className="flex flex-1 flex-col items-start gap-1">
                      <span className="text-xs font-normal leading-[15px] text-[#999999]">
                        {t('create.media.socialInitiatives')}
                      </span>
                      <div className="break-words text-left text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727]">
                        {(formData.selectedCommunityServiceIds || []).length > 0
                          ? t('create.media.initiativesSelected').replace(
                              '{{count}}',
                              (formData.selectedCommunityServiceIds || []).length.toString(),
                            )
                          : t('create.media.selectInitiatives')}
                      </div>
                    </div>
                    <div className="ml-2 flex flex-shrink-0 items-center justify-center self-center">
                      <Icon
                        className="h-6 w-6 text-[#232323]"
                        icon="material-symbols:chevron-right"
                      />
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
          // AC5.2: at least one image is required; the schema names any other
          // missing field when the button is clicked.
          disabled: isSubmitting || !(formData.images && formData.images.length > 0),
          loading: isSubmitting,
          loadingText: t('create.media.creating'),
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}
