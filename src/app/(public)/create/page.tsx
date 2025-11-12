'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { PageHeader, ScrollablePageLayout, PageContent } from '@/components/layout';
import { ProviderOptionCard } from '@/components/create/ProviderOptionCard';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { getFeatureFlag } from '@/config/feature-flags';

export default function CreateProviderPage() {
  const router = useRouter();
  const isMobile = useIsSmallMobile();
  const { t } = useLanguage();
  
  // Feature flags
  const isQuickImportEnabled = getFeatureFlag('enableQuickImport');

  const handleOwnProvider = () => {
    router.push('/create/basics');
  };

  const handleRecommendProvider = () => {
    router.push('/recommend-provider');
  };

  const handleQuickCreate = () => {
    router.push('/create-quick');
  };

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-500">
          {t('create.basics.desktopMessage')}
        </p>
      </div>
    );
  }

  return (
    <ScrollablePageLayout>
      <PageHeader 
        title={t('create.title')} 
        variant="title-only"
      />
      
      <PageContent 
        className="flex flex-col items-center gap-8"
        maxWidth="full"
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
          <p className="font-normal text-base leading-[19px] text-[#7A7A7A] text-left mb-6">
            {t('create.description')}
          </p>
        </div>

        {/* Quick Create Option - Feature Flagged */}
        {isQuickImportEnabled && (
          <div className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-full bg-primary/20 p-2">
                <Icon className="h-5 w-5 text-primary" icon="mdi:lightning-bolt" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-content-heading mb-1">
                  Quick Import (Beta)
                </h3>
                <p className="text-sm text-content leading-relaxed">
                  Import from Google or Instagram and auto-fill everything in seconds!
                </p>
              </div>
            </div>
            <button
              className="w-full rounded-xl bg-primary hover:bg-primary-dark px-5 py-3 text-base font-medium text-white transition-colors"
              onClick={handleQuickCreate}
            >
              Try Quick Import
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-3 w-full">
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
      </PageContent>
    </ScrollablePageLayout>
  );
}