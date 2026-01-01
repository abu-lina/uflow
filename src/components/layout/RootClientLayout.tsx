'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
import { DesktopFooter } from '@/components/layout/DesktopFooter';
import { PageTransition } from '@/components/ui/PageTransition';
import { FooterAction } from '@/components/ui/FooterAction';
import { PushNotificationPrompt } from '@/components/ui/PushNotificationPrompt';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { getFeatureFlag } from '@/config/feature-flags';
import { shouldShowMobileFooter, shouldShowCityEarlyAccessNavbar, shouldShowSubpageAction, getPageType } from '@/utils/navigationUtils';

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
  
  // Check feature flag synchronously on client-side (not in useEffect to avoid timing issues)
  const isAppLaunched = typeof window !== 'undefined' ? getFeatureFlag('isAppLaunched') : false;

  // Use utility functions for cleaner logic
  const pageType = getPageType(pathname);
  const { isLandingPage } = pageType;
  
  // Determine what UI elements should be shown
  // CRITICAL: This must be calculated on every render to catch state changes
  const showMobileFooter = shouldShowMobileFooter(pathname, isSplashVisible, user, isAppLaunched);
  const showCityEarlyAccessNavbar = shouldShowCityEarlyAccessNavbar(pathname, isAppLaunched, user);
  const showSubpageAction = shouldShowSubpageAction(pathname);

  return (
    <LoadingProvider>
      <div className="page-background relative flex h-screen-fix flex-col">
        {/* Dev-only: ensure no service worker interferes with HMR/chunks (only on localhost) */}
        {process.env.NODE_ENV === 'development' && 
         typeof window !== 'undefined' && 
         (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
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
        
        {/* Mobile Footer - Stage 3 (Full Access) */}
        {showMobileFooter && (
          <div className="block md:hidden">
            <MobileFooterBar />
          </div>
        )}

        {/* City Early Access Navbar - Stages 1 & 2 (Early Access) */}
        {showCityEarlyAccessNavbar && (
          <div className="block md:hidden">
            <CityEarlyAccessNavbar />
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
            .then(() => {
              // Service worker registered successfully
            })
            .catch((error) => {
              // Log errors in all environments for debugging
              console.error('❌ Service Worker registration failed:', error);
              // Could integrate with error monitoring service here
            });
        }
      }).catch((error) => {
        // Handle errors when checking registrations
        console.error('❌ Failed to check service worker registrations:', error);
      });
    }
  }, []);
  return null;
}
