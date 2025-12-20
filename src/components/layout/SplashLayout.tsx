'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface SplashLayoutProps {
  children: ReactNode;
  onContinue: () => void;
  continueText?: string;
  animationDelay?: number;
}

function SplashLayout({ 
  children, 
  onContinue, 
  continueText = "Weiter",
  animationDelay = 0 
}: SplashLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Language switcher portal - render at document root to avoid clipping
  const languageSwitcherPortal = isMounted && typeof document !== 'undefined' && document.body ? createPortal(
    <div 
      className="fixed top-2 right-2 z-[9999] md:top-3 md:right-3" 
      style={{ 
        paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
        paddingRight: 'max(env(safe-area-inset-right), 0.25rem)'
      }}
    >
      <LanguageSwitcher variant="dropdown" />
    </div>,
    document.body
  ) : null;

  return (
    <>
      {languageSwitcherPortal}
      <PageLayout hasBackground={false}>
        {/* HEADER SECTION - Using PageHeader with centered logo */}
        <PageHeader 
          customContent={
            <div className="flex items-center justify-center w-full">
              <Logo className="h-12 w-12" height={48} width={48} />
            </div>
          }
          title=""
          variant="title-only"
        />

      {/* HEADER SPACER */}
      <HeaderSpacer />

      {/* CONTENT SECTION - Using PageContentWrapper like profile page */}
      <PageContentWrapper 
        className="pb-8"
        includeMobileNavSpacing={true}
      >
        {children}
      </PageContentWrapper>

      {/* NAVBAR SECTION - Fixed at bottom */}
      <MobileNavbar
        animationDelay={animationDelay}
        text={continueText}
        onClick={onContinue}
      />
      </PageLayout>
    </>
  );
}

export { SplashLayout };
export default SplashLayout;
