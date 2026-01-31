'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { StreamlinedRecommendForm } from '@/features/providers/StreamlinedRecommendForm';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function RecommendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCreationMode } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();
  
  // Check if success screen should be shown from URL
  const showSuccessScreen = searchParams.get('success') === 'true';

  // Initial city from storage: start as '' so server and first client paint match (avoids hydration mismatch)
  const [initialCity, setInitialCity] = useState('');
  useEffect(() => {
    setInitialCity(localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity') || '');
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
    const city = initialCity || 
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

  const LayoutComponent = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  return (
    <LayoutComponent>
      {!showSuccessScreen && (
        <PageHeader
          title={pageTitle}
          variant="back-and-title"
          onBack={handleBack}
        />
      )}

      <PageContent
        className={cn(
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <StreamlinedRecommendForm
          initialCity={initialCity}
          onSuccess={handleSuccess}
        />
      </PageContent>
    </LayoutComponent>
  );
}

