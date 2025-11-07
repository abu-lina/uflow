'use client';

import { ReactNode, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { PageTransition } from '@/components/ui/PageTransition';
import { FooterAction } from '@/components/ui/FooterAction';
import { PushNotificationPrompt } from '@/components/ui/PushNotificationPrompt';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';
import { useAuth } from '@/providers/auth-provider';
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
          <FooterAction
            actionButton={{
              label: pathname === '/signup/check-email' ? t('signup.afterConfirmationLogin') : t('common.next'),
              icon: 'material-symbols:chevron-right',
              onClick: () => {
                  if (pathname === '/signup/check-email') {
                    router.push('/login');
                  } else {
                    router.back();
                  }
              },
              variant: 'primary',
              'aria-label': pathname === '/signup/check-email' ? t('signup.afterConfirmationLogin') : t('common.next'),
            }}
          />
        )}

        {/* Push Notification Prompt */}
        <PushNotificationPrompt 
          autoShow={true}
          showDelay={5000}
        />
      </div>
    </LoadingProvider>
  );
}
