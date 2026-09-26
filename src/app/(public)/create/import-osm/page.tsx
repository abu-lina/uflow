'use client';

import { Suspense, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { StreamlinedImportForm } from '@/features/providers/StreamlinedImportForm';
import { LoginGate } from '@/components/shared/LoginGate';
import { useFormData } from '@/providers/form-provider';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';

function ImportOSMPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCreationMode } = useFormData();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();

  // Check if success screen should be shown from URL
  const showSuccessScreen = searchParams.get('success') === 'true';

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Memoize initial city to prevent re-computation on every render
  const initialCity = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity') || '';
  }, []);

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
  const pageTitle = useMemo(() => t('create.importOsm.title'), [t]);

  // Recommendations require a logged-in user (#415) — same gate as
  // /create/recommend and the owner flow.
  if (!isAuthLoading && !user) {
    return <LoginGate returnPath="/create/import-osm" title={pageTitle} />;
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
        <StreamlinedImportForm initialCity={initialCity} onSuccess={handleSuccess} />
      </PageContent>
    </ScrollablePageLayout>
  );
}

export default function ImportOSMPage() {
  return (
    <Suspense fallback={null}>
      <ImportOSMPageContent />
    </Suspense>
  );
}
