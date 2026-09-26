'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ProviderOptionCard } from '@/components/create/ProviderOptionCard';
import { useLanguage } from '@/providers/LanguageProvider';
import { useFormData } from '@/providers/form-provider';
import { getFeatureFlag } from '@/config/feature-flags';
import { cn } from '@/lib/utils';

export default function CreateProviderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setCreationMode } = useFormData();

  // Feature flags
  const isQuickImportEnabled = getFeatureFlag('enableQuickImport');

  // AC4.3: creationMode is set BEFORE navigating. mutations.ts derives
  // isOwner from formData.creationMode and writes provider_owner_id from it;
  // leaving the mode ambiguous (or recovering it from stale localStorage at
  // the destination) can silently grant the submitter ownership of a
  // business they only recommended.
  const handleOwnProvider = () => {
    setCreationMode('owner');
    router.push('/create/basics');
  };

  const handleRecommendProvider = () => {
    setCreationMode('recommendation');
    router.push('/create/recommend');
  };

  const handleQuickCreate = () => {
    router.push('/create-quick');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.title')}
        variant="back-and-title"
        onBack={() => router.push('/')}
      />

      <PageContent
        centerVertically
        className={cn(
          'flex flex-col items-center gap-8',
          'sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl',
        )}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
          <p className="mb-6 max-w-2xl text-left text-base font-normal leading-[19px] text-[#7A7A7A] md:text-lg md:leading-6">
            {t('create.description')}
          </p>
        </div>

        {/* Quick Create Option - Feature Flagged, Mobile Only */}
        {isQuickImportEnabled && (
          <div className="sm:hidden">
            <div className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="rounded-full bg-primary/20 p-2">
                  <Icon className="h-5 w-5 text-primary" icon="mdi:lightning-bolt" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-base font-semibold text-content-heading">
                    Quick Import (Beta)
                  </h3>
                  <p className="text-sm leading-relaxed text-content">
                    Import from Google or Instagram and auto-fill everything in seconds!
                  </p>
                </div>
              </div>
              <button
                className="w-full rounded-xl bg-primary px-5 py-3 text-base font-medium text-white transition-colors hover:bg-primary-dark"
                onClick={handleQuickCreate}
              >
                Try Quick Import
              </button>
            </div>
          </div>
        )}

        <div className={cn('flex w-full flex-col gap-3 md:gap-6')}>
          <ProviderOptionCard
            buttonText={t('create.ownProvider.buttonText')}
            description={t('create.ownProvider.description')}
            title={t('create.ownProvider.title')}
            variant="store"
            onClick={handleOwnProvider}
          />

          <ProviderOptionCard
            buttonText={t('create.recommendProvider.buttonText')}
            description={t('create.recommendProvider.description')}
            title={t('create.recommendProvider.title')}
            variant="recommend"
            onClick={handleRecommendProvider}
          />
        </div>

        {/* Chat alternative hint */}
        <p className="text-center text-sm text-[#7A7A7A]">
          {t('create.chatHint.prefix')}{' '}
          <Link
            className="font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-70"
            href="/"
          >
            {t('create.chatHint.link')}
          </Link>
        </p>
      </PageContent>
    </ScrollablePageLayout>
  );
}
