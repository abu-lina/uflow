'use client';

import { ReactNode } from 'react';

import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { Logo } from '@/components/ui/Logo';

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
  return (
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
  );
}

export { SplashLayout };
export default SplashLayout;
