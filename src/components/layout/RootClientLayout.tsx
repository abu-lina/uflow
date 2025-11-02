'use client';

import { ReactNode, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/Button';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/providers/LanguageProvider';
import { shouldShowMobileFooter, shouldShowSubpageAction, getPageType } from '@/utils/navigationUtils';

interface RootClientLayoutProps {
  children: ReactNode;
}

export function RootClientLayout({ children }: RootClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { isSplashVisible } = useSplash();
  const { t } = useLanguage();
  const mainRef = useRef<HTMLElement>(null);

  // Use utility functions for cleaner logic
  const pageType = getPageType(pathname);
  const { isLandingPage } = pageType;
  
  // Determine what UI elements should be shown
  const showMobileFooter = shouldShowMobileFooter(pathname, isSplashVisible, user);
  const showSubpageAction = shouldShowSubpageAction(pathname);

  // Note: Debug logging removed for production readiness

  return (
    <LoadingProvider>
      <div className="page-background relative flex h-screen-fix flex-col">
        {/* Mobile Header - Above all content, edge-to-edge */}
        {isLandingPage && (
          <div className="block md:hidden">
            {/* Header will be rendered by MobileSplashScreen or AboutPageContent */}
          </div>
        )}
        
        <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </main>
        {showMobileFooter && (
          <div className="block md:hidden">
            <MobileFooterBar />
          </div>
        )}

        {/* Action button for subpages */}
        {showSubpageAction && (
          <div 
            className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px] block md:hidden" 
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
              <Button
                fullWidth
                className="w-full max-w-[345px] shadow-[0px_8px_24px_rgba(88,157,150,0.25)] relative"
                size="footer"
                variant="primary"
                onClick={() => {
                  if (pathname === '/signup/check-email') {
                    router.push('/login');
                  } else {
                    router.back();
                  }
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-base font-medium text-white leading-[19px]">
                    {pathname === '/signup/check-email' ? t('signup.afterConfirmationLogin') : t('common.next')}
                  </span>
                  <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />
                </div>
              </Button>
            </div>
          </div>
        )}
      </div>
    </LoadingProvider>
  );
}
