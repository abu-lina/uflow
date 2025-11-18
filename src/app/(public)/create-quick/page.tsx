'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { Button } from '@/components/ui/Button';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { DynamicImportLoading } from '@/components/ui/DynamicImportLoading';
import { DynamicImportError } from '@/components/ui/DynamicImportError';
import type { PlaceData } from '@/components/create/BusinessSearch';
import type { InstagramData } from '@/components/create/InstagramImport';

// Lazy load heavy import components
const BusinessSearch = dynamic(() => import('@/components/create/BusinessSearch').then(mod => ({ default: mod.BusinessSearch })), {
  loading: () => <DynamicImportLoading />,
  ssr: false,
});

const InstagramImport = dynamic(() => import('@/components/create/InstagramImport').then(mod => ({ default: mod.InstagramImport })), {
  loading: () => <DynamicImportLoading />,
  ssr: false,
});

type ImportMethod = 'google' | 'instagram' | null;

export default function QuickCreatePage() {
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { updateFormData } = useFormData();
  const isMobile = useIsSmallMobile();
  const { t } = useLanguage();

  const handleGoogleSelect = (placeData: PlaceData) => {
    console.log('Google Place selected:', placeData);
    
    // Map Google data to form data
    updateFormData({
      title: placeData.name,
      street: placeData.street,
      city: placeData.city,
      zip: placeData.zip,
      country: placeData.country,
      phone: placeData.phone || '',
      website: placeData.website || '',
      description: '', // Will be filled in review page
      isOnlineBusiness: false,
      showAddress: true,
    });

    // Navigate to review page
    router.push('/create-quick/review?source=google');
  };

  const handleInstagramImport = (instagramData: InstagramData) => {
    console.log('Instagram data imported:', instagramData);
    
    // Map Instagram data to form data
    updateFormData({
      title: instagramData.name,
      description: instagramData.biography,
      website: instagramData.website || '',
      instagram: `https://instagram.com/${instagramData.username}`,
      email: instagramData.businessEmail || '',
      phone: instagramData.businessPhone || '',
      // Address will need to be filled manually or via secondary search
      street: instagramData.businessAddress || '',
      city: '',
      zip: '',
      country: '',
    });

    // Navigate to review page
    router.push('/create-quick/review?source=instagram');
  };

  const handleManualCreate = () => {
    router.push('/create/basics');
  };

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.basics.desktopMessage')}
        </span>
      </div>
    );
  }

  // Authentication check
  if (!user) {
    const returnUrl = encodeURIComponent('/create-quick');
    
    return (
      <PageLayout hasBackground={false} maxWidth="full">
        <PageHeader title="Quick Create" />
        <HeaderSpacer />

        <PageContentWrapper centerVertically={true} maxWidth="full" padding="lg-safe">
          <div className="flex w-full flex-col">
            <div className="mb-10">
              <IconWithTitle
                icon={<Icon className="w-full h-full text-content-heading" icon="material-symbols:lock-outline" />}
                size="large"
                title={t('create.basics.loginRequired')}
              >
                <p className="text-center text-base leading-normal text-content mt-2">
                  {t('create.basics.loginDescription')}
                </p>
              </IconWithTitle>
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                fullWidth
                type="button"
                variant="auth"
                onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
              >
                {t('create.basics.goToLogin')}
              </Button>
            </div>
          </div>
        </PageContentWrapper>
      </PageLayout>
    );
  }

  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader
        title="Quick Create"
        variant="back-and-title"
        onBack="/create"
      />
      <HeaderSpacer />

      <PageContentWrapper maxWidth="full" padding="lg-safe">
        <div className="flex flex-col gap-6 pb-24">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-content-heading">
              Import your business details
            </h2>
            <p className="text-sm text-content">
              Choose how you want to add your business. We&apos;ll auto-fill as much as possible!
            </p>
          </div>

          {/* Method Selection Tabs */}
          {selectedMethod === null && (
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#D4D4D4] bg-white p-6 transition-all hover:border-primary hover:bg-primary/5"
                onClick={() => setSelectedMethod('google')}
              >
                <div className="rounded-full bg-[#4285F4]/10 p-3">
                  <Icon className="h-8 w-8 text-[#4285F4]" icon="mdi:google" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-content-heading">Google</p>
                  <p className="text-xs text-[#7A7A7A] mt-1">Search business</p>
                </div>
              </button>

              <button
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#D4D4D4] bg-white p-6 transition-all hover:border-primary hover:bg-primary/5"
                onClick={() => setSelectedMethod('instagram')}
              >
                <div className="rounded-full bg-[#E4405F]/10 p-3">
                  <Icon className="h-8 w-8 text-[#E4405F]" icon="mdi:instagram" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-content-heading">Instagram</p>
                  <p className="text-xs text-[#7A7A7A] mt-1">Import profile</p>
                </div>
              </button>
            </div>
          )}

          {/* Back Button if method selected */}
          {selectedMethod && (
            <button
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
              onClick={() => setSelectedMethod(null)}
            >
              <Icon className="h-4 w-4" icon="mdi:arrow-left" />
              <span>Choose different method</span>
            </button>
          )}

          {/* Google Places Search */}
          {selectedMethod === 'google' && (
            <BusinessSearch
              onManualCreate={handleManualCreate}
              onSelect={handleGoogleSelect}
            />
          )}

          {/* Instagram Import */}
          {selectedMethod === 'instagram' && (
            <InstagramImport onImport={handleInstagramImport} />
          )}

          {/* Benefits Section */}
          {selectedMethod === null && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-semibold text-content-heading">
                Why use quick import?
              </h3>
              
              <div className="space-y-2">
                {[
                  { icon: 'mdi:lightning-bolt', text: 'Save time - import in seconds' },
                  { icon: 'mdi:check-circle', text: 'Auto-fill all business details' },
                  { icon: 'mdi:image-multiple', text: 'Automatically import photos' },
                  { icon: 'mdi:pencil', text: 'Review and edit before publishing' },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" icon={benefit.icon} />
                    <span className="text-sm text-content">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Entry Option */}
          {selectedMethod === null && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-[#E5E5E5]" />
                <span className="text-sm text-[#999999]">or</span>
                <div className="flex-1 h-px bg-[#E5E5E5]" />
              </div>

              <button
                className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-[#D4D4D4] bg-white px-5 py-4 text-base font-medium text-content-heading transition-colors hover:border-primary hover:bg-primary/5"
                onClick={handleManualCreate}
              >
                <Icon className="h-5 w-5" icon="mdi:pencil" />
                <span>Use traditional form (step-by-step)</span>
              </button>
            </>
          )}
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}

