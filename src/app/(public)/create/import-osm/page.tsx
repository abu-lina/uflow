'use client';

import { Suspense, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { StreamlinedImportForm } from '@/features/providers/StreamlinedImportForm';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';

function ImportOSMPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCreationMode } = useFormData();
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
