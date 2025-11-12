'use client';

import { useRouter } from 'next/navigation';

import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';
import { FooterAction } from '@/components/ui';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ContactPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();

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



  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.contact.desktopMessage')}
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/contact');
    return (
      <ScrollablePageLayout>
        <PageHeader title={t('create.contact.title')} variant="title-only" />

        <PageContent className="flex flex-1 flex-col items-center justify-center">
          <span className="text-center text-lg text-content-heading mb-6">
            {t('create.contact.loginRequired')}
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
          >
            {t('create.contact.goToLogin')}
          </button>
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  const handleSave = () => {
    router.push('/create/media');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.contact.title')}
        variant="back-and-title"
        onBack="/create/location"
      />

      <PageContent hasFooter className="flex flex-col gap-6">
        {/* Step Indicator */}
        <div className="mb-6">
          <StepIndicator currentStep={2} steps={STEPS} />
        </div>

        {/* Subtitle */}
        <div className="flex flex-col items-start px-3 py-0 space-y-3 w-full">
          <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left mb-6">
            {t('create.contact.description')}
          </p>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4 w-full">
          {/* Website */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
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
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
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
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
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
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
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
