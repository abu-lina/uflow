'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function ContactPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Determine if in recommendation mode
  const isRecommendationMode = formData.creationMode === 'recommendation';

  // Steps with translations - 3 steps for recommendation, 4 for owner
  const STEPS_RECOMMENDATION = [
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
  ];

  const STEPS_OWNER = [
    ...STEPS_RECOMMENDATION,
    {
      title: t('create.steps.media'),
      icon: 'mdi:image-multiple',
    },
  ];

  const STEPS = isRecommendationMode ? STEPS_RECOMMENDATION : STEPS_OWNER;

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // The recommend flow submits from /create/recommend (StreamlinedRecommendForm).
  // This wizard page is owner-mode only; redirect stale recommendation state.
  if (isRecommendationMode) {
    router.replace('/create/recommend');
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // In recommendation mode, allow anonymous users (skip auth check)
  // Authentication check - redirect to login with return URL (unless recommendation mode)
  if (!user && !isRecommendationMode) {
    const returnUrl = encodeURIComponent('/create/contact');
    return (
      <ScrollablePageLayout>
        <PageHeader title={t('create.contact.title')} variant="title-only" />

        <PageContent
          className={cn(
            'flex flex-1 flex-col items-center justify-center',
            'sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl',
          )}
          maxWidth="full"
          paddingX="px-6 sm:px-0"
        >
          <span className="mb-6 text-center text-lg text-content-heading">
            {t('create.contact.loginRequired')}
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            {t('create.contact.goToLogin')}
          </button>
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  const handleSave = () => {
    // Owner mode: navigate to the halal step
    router.push('/create/halal');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.contact.title')}
        variant="back-and-title"
        onBack="/create/location"
      />

      <PageContent
        hasFooter
        className={cn(
          'flex flex-col gap-6',
          'sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl',
        )}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        {/* Step Indicator */}
        <div className="mb-6">
          <StepIndicator currentStep={2} steps={STEPS} />
        </div>

        {/* Subtitle */}
        <div className="flex w-full flex-col items-start space-y-3 px-3 py-0">
          <p className="mb-6 text-left text-base font-normal leading-[19px] text-[#7A7A7A]">
            {t('create.contact.description')}
          </p>
        </div>

        {/* Form Fields */}
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap">
          {/* Website */}
          <div
            className={cn(
              'flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2',
              'md:w-[calc(50%-8px)]',
            )}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                {t('create.contact.website')}
              </label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder={t('create.contact.websitePlaceholder')}
                type="url"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
              />
            </div>
          </div>

          {/* Instagram */}
          <div
            className={cn(
              'flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2',
              'md:w-[calc(50%-8px)]',
            )}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                {t('create.contact.instagram')}
              </label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder={t('create.contact.instagramPlaceholder')}
                type="text"
                value={formData.instagram}
                onChange={(e) => updateFormData({ instagram: e.target.value })}
              />
            </div>
          </div>

          {/* Phone */}
          <div
            className={cn(
              'flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2',
              'md:w-[calc(50%-8px)]',
            )}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                {t('create.contact.phone')}
              </label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder={t('create.contact.phonePlaceholder')}
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div
            className={cn(
              'flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2',
              'md:w-[calc(50%-8px)]',
            )}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                {t('create.contact.email')}
              </label>
              <input
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder={t('create.contact.emailPlaceholder')}
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
              />
            </div>
          </div>
        </div>
      </PageContent>

      {/* Footer Action */}
      <FooterAction
        actionButton={{
          label: t('common.next'),
          trailingIcon: 'lucide:chevron-right',
          onClick: handleSave,
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}
