'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ProviderOptionCard } from '@/components/create/ProviderOptionCard';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { getFeatureFlag } from '@/config/feature-flags';
import { cn } from '@/lib/utils';

export default function CreateProviderPage() {
  const router = useRouter();
  const isMobile = useIsSmallMobile();
  const { t } = useLanguage();
  
  // Feature flags
  const isQuickImportEnabled = getFeatureFlag('enableQuickImport');
  const isOSMImportEnabled = getFeatureFlag('enableOSMImport');

  const handleOwnProvider = () => {
    router.push('/create/basics');
  };

  const handleRecommendProvider = () => {
    router.push('/recommend-provider');
  };

  const handleQuickCreate = () => {
    router.push('/create-quick');
  };

  const handleOSMImport = () => {
    router.push('/create/import-osm');
  };

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  return (
    <Layout>
      <PageHeader 
        title={t('create.title')} 
        variant="title-only"
      />
      
      <PageContent 
        centerVertically={!isMobile}
        className={cn(
          'flex flex-col items-center gap-8',
          !isMobile && 'max-w-2xl lg:max-w-4xl mx-auto px-6 md:px-8'
        )}
        maxWidth={isMobile ? 'full' : 'full'}
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full">
          <p className="font-normal text-base md:text-lg leading-[19px] md:leading-6 text-[#7A7A7A] text-left mb-6 max-w-2xl">
            {t('create.description')}
          </p>
        </div>

        {/* Quick Create Option - Feature Flagged, Mobile Only */}
        {isQuickImportEnabled && isMobile && (
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

        {/* OSM Import Option - Feature Flagged */}
        {isOSMImportEnabled && (
          <div className="w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-full bg-primary/20 p-2">
                <Icon className="h-5 w-5 text-primary" icon="mdi:map-marker" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-content-heading mb-1">
                  {t('create.importOsm.title')} (Beta)
                </h3>
                <p className="text-sm text-content leading-relaxed">
                  Search and import mosques, halal restaurants, and other Muslim places from OpenStreetMap
                </p>
              </div>
            </div>
            <button
              className="w-full rounded-xl bg-primary hover:bg-primary-dark px-5 py-3 text-base font-medium text-white transition-colors"
              onClick={handleOSMImport}
            >
              {t('create.importOsm.title')}
            </button>
          </div>
        )}
        
        <div className={cn(
          'flex flex-col w-full gap-3 md:gap-6'
        )}>
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
      
      {/* Bottom Navigation Bar */}
      <CityEarlyAccessNavbar />
    </Layout>
  );
}