'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { ContentSection } from '@/components/layout/ContentSection';
import { ProviderOptionCard } from '@/components/create/ProviderOptionCard';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';

export default function CreateProviderPage() {
  const router = useRouter();
  const isMobile = useIsSmallMobile();
  const { t } = useLanguage();

  const handleOwnProvider = () => {
    router.push('/create/basics');
  };

  const handleRecommendProvider = () => {
    router.push('/recommend-provider');
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
    <PageLayout hasBackground={false}>
      <PageHeader title={t('create.title')} />

      <HeaderSpacer />

      <PageContentWrapper includeMobileNavSpacing={true}>
        <div className="flex flex-col items-center gap-8 w-full">
          <ContentSection>
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A]">
              {t('create.description')}
            </p>
          </ContentSection>

          <ContentSection>
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
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}