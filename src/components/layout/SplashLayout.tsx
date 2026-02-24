'use client';

import { ReactNode, useEffect, useState, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/providers/LanguageProvider';

interface SplashLayoutProps {
  children: ReactNode;
  onContinue: () => void;
  continueText?: string;
  animationDelay?: number;
}

function SplashLayout({ 
  children, 
  onContinue, 
  continueText: _continueText,
  animationDelay: _animationDelay = 0 
}: SplashLayoutProps) {
  const { t } = useLanguage();
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

  // Check if header has visible content (empty title means no visible header)
  const hasHeaderContent = false; // PageHeader with empty title has no visible content
  const footerText = t('splash.footer');
  const hasFooterContent = footerText && footerText.trim().length > 0;

  return (
    <>
      {languageSwitcherPortal}
      <div className="flex flex-col h-screen-fix">
        {/* HEADER SECTION - Only render if there's visible content */}
        {hasHeaderContent && (
          <>
            <PageHeader 
              title=""
              variant="title-only"
            />
            <HeaderSpacer />
          </>
        )}

        {/* CONTENT SECTION - Always centered */}
        <div className="flex-1 w-full px-6 flex items-center justify-center">
          {isValidElement(children) && children.type
            ? cloneElement(children, { onContinue } as { onContinue: () => void })
            : children}
        </div>

        {/* FOOTER SECTION - Only render if there's content */}
        {hasFooterContent && (
          <footer className="w-full py-4 px-6 flex-shrink-0">
            <p className="font-inter text-xs font-light leading-[13px] text-center text-content-muted">
              {footerText}
            </p>
          </footer>
        )}
      </div>
    </>
  );
}

export { SplashLayout };
export default SplashLayout;
