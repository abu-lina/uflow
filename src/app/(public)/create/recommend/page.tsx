'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const { setCreationMode } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Get city from localStorage
  const getInitialCity = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity') || '';
  };

  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  const handleBack = () => {
    router.push('/');
  };

  const handleSuccess = () => {
    router.push('/waitlist');
  };

  return (
    <Layout>
      <PageHeader
        title={t('create.recommend.title')}
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent
        className={cn(
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <StreamlinedRecommendForm
          initialCity={getInitialCity()}
          onSuccess={handleSuccess}
        />
      </PageContent>
    </Layout>
  );
}

