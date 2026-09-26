'use client';

import { Suspense, useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { StreamlinedRecommendForm } from '@/features/providers/StreamlinedRecommendForm';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function RecommendPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCreationMode } = useFormData();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  // Check if success screen should be shown from URL
  const showSuccessScreen = searchParams.get('success') === 'true';

  // Initial city from storage: start as '' so server and first client paint match (avoids hydration mismatch)
  const [initialCity, setInitialCity] = useState('');
  useEffect(() => {
    setInitialCity(
      localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity') || '',
    );
  }, []);

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Memoize callbacks to prevent prop changes
  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleSuccess = useCallback(() => {
    // Redirect back to city overview after successful recommendation
    const city =
      initialCity ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
        : '');

    if (city) {
      router.push(`/city/${encodeURIComponent(city)}`);
    } else {
      // Fallback to home if no city is available
      router.push('/');
    }
  }, [router, initialCity]);

  // Memoize title to prevent re-computation
  const pageTitle = useMemo(() => t('create.recommend.title'), [t]);

  // Recommendations require a logged-in user (#415). Same lock screen the
  // owner flow uses on /create/basics: login, then return here.
  if (!isAuthLoading && !user) {
    const returnUrl = encodeURIComponent('/create/recommend');
    return (
      <ScrollablePageLayout>
        <PageHeader title={pageTitle} />
        <PageContent
          className={cn(
            'flex min-h-[60vh] items-center justify-center',
            'sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8',
          )}
          maxWidth="full"
          paddingX="px-6 sm:px-0"
        >
          <div className="flex w-full flex-col">
            <TitleSection className="mb-10">
              <IconWithTitle
                icon={<Icon className="h-full w-full text-content-heading" icon="lucide:lock" />}
                size="large"
                title={t('create.basics.loginRequired')}
              >
                <p className="mt-2 text-center text-base leading-normal text-content">
                  {t('create.basics.loginDescription')}
                </p>
              </IconWithTitle>
            </TitleSection>
            <ContentSection>
              <Button
                fullWidth
                type="button"
                variant="auth"
                onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
              >
                {t('create.basics.goToLogin')}
              </Button>
            </ContentSection>
          </div>
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  return (
    <ScrollablePageLayout>
      {!showSuccessScreen && (
        <PageHeader title={pageTitle} variant="back-and-title" onBack={handleBack} />
      )}

      <PageContent
        className="sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8"
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <StreamlinedRecommendForm initialCity={initialCity} onSuccess={handleSuccess} />
      </PageContent>
    </ScrollablePageLayout>
  );
}

export default function RecommendPage() {
  return (
    <Suspense fallback={null}>
      <RecommendPageContent />
    </Suspense>
  );
}
