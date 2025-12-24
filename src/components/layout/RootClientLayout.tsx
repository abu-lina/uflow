'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { DesktopFooter } from '@/components/layout/DesktopFooter';
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
        {/* Dev-only: ensure no service worker interferes with HMR/chunks */}
        {process.env.NODE_ENV === 'development' && (
          <DevServiceWorkerReset />
        )}
        {/* Auto-register service worker for PWA */}
        <ServiceWorkerRegistration />
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
        
        {/* Desktop Footer */}
        <div className="hidden md:block">
          <DesktopFooter />
        </div>
        
        {/* Mobile Footer */}
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
        {process.env.NODE_ENV === 'production' && (
          <PushNotificationPrompt 
            autoShow={true}
            showDelay={5000}
          />
        )}
      </div>
    </LoadingProvider>
  );
}

function DevServiceWorkerReset() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      // Clear any runtime caches created by SW
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    }
  }, []);
  return null;
}

function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker if:
    // 1. We're in a browser environment
    // 2. Service workers are supported
    // 3. We're not on localhost (PWA should be disabled for local dev)
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    ) {
      // Check if already registered
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length === 0) {
          // Register service worker
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch((error) => {
              console.error('❌ Service Worker registration failed:', error);
            });
        }
      });
    }
  }, []);
  return null;
}
