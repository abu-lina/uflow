'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { ContentSection } from '@/components/layout/ContentSection';
import { ProviderOptionCard } from '@/components/create/ProviderOptionCard';

export default function CreateProviderPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          Bitte nutze die Mobile-Ansicht für diese Seite.
        </p>
      </div>
    );
  }

  return (
    <PageLayout hasBackground={false}>
      <PageHeader title="Anbieter hinzufügen" />

      <HeaderSpacer />

      <PageContentWrapper includeMobileNavSpacing={true}>
        <div className="flex flex-col items-center gap-8 w-full">
          <ContentSection>
            <p className="font-normal text-base leading-[19px] text-[#7A7A7A]">
              Füge einen neuen Anbieter hinzu oder empfehle jemanden, den du kennst.
            </p>
          </ContentSection>

          <ContentSection>
            <div className="flex flex-col gap-3 w-full">
              <ProviderOptionCard
                buttonText="Eigenes Angebot erstellen"
                description="Erstelle dein eigenes Profil, um dein Angebot sichtbar zu machen."
                title="Ich bin der Anbieter"
                variant="store"
                onClick={handleOwnProvider}
              />

              <ProviderOptionCard
                buttonText="Anbieter empfehlen"
                description="Empfiehl jemanden, den du kennst, damit andere ihn finden können."
                title="Ich kenne einen Anbieter"
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