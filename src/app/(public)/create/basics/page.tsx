'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { UnifiedProviderCreateForm } from '@/features/providers/UnifiedProviderCreateForm';
import { LoginGate } from '@/components/shared/LoginGate';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function CreateBasicsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { setCreationMode, isLoading: isFormDataLoading } = useFormData();
  const { t } = useLanguage();

  const isLoading = isAuthLoading || isFormDataLoading;

  // AC4.3 (#415): this page is owner-create only. The chooser sets the mode
  // before navigating; re-assert it unconditionally here so stale
  // 'recommendation' state in localStorage can neither skip the login gate
  // below nor leak into provider_owner_id on submit. Recommendations live
  // on /create/recommend and require login too.
  useEffect(() => {
    setCreationMode('owner');
  }, [setCreationMode]);

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    return <LoginGate returnPath="/create/basics" title={t('create.basics.title')} />;
  }

  const handleBack = () => {
    router.push('/create');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader title={t('create.basics.title')} variant="back-and-title" onBack={handleBack} />

      <PageContent
        className={cn('sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8')}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <div className="sm:hidden">
          <ProviderCreateForm
            onNextStep={() => {
              router.push('/create/location');
            }}
          />
        </div>
        <div className="hidden sm:block">
          <UnifiedProviderCreateForm />
        </div>
      </PageContent>
    </ScrollablePageLayout>
  );
}
