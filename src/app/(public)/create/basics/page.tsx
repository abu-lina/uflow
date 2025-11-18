'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { Button } from '@/components/ui/Button';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';

export default function CreateBasicsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, setCreationMode } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();

  // Set creation mode once on mount if not already set to recommendation
  useEffect(() => {
    // Only set to 'owner' if it's not already 'recommendation'
    // (which would have been set by the /recommend-provider route)
    if (formData.creationMode !== 'recommendation') {
      setCreationMode('owner');
    }
    // Only run once on mount - don't include formData.creationMode in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCreationMode]);


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

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/basics');
    
    return (
      <ScrollablePageLayout>
        <PageHeader
          title={t('create.basics.title')}
        />

        <PageContent className="flex items-center justify-center min-h-[60vh]" maxWidth="full">
          <div className="flex w-full flex-col">
            <TitleSection className="mb-10">
              <IconWithTitle
                icon={<Icon className="w-full h-full text-content-heading" icon="material-symbols:lock-outline" />}
                size="large"
                title={t('create.basics.loginRequired')}
              >
                <p className="text-center text-base leading-normal text-content mt-2">
                  {t('create.basics.loginDescription')}
                </p>
              </IconWithTitle>
            </TitleSection>

            <ContentSection>
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
            </ContentSection>
          </div>
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.basics.title')}
        variant="back-and-title"
        onBack="/create"
      />

      <PageContent maxWidth="full">
        <ProviderCreateForm 
          onNextStep={() => {
            // Navigate to location page
            router.push('/create/location');
          }}
        />
      </PageContent>
    </ScrollablePageLayout>
  );
}