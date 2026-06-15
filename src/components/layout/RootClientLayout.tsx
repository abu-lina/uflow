'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { ChatFloatingWidget } from '@/features/chat/components/ChatFloatingWidget';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';
import { DesktopFooter } from '@/components/layout/DesktopFooter';
import { PageTransition } from '@/components/ui/PageTransition';
const FooterAction = dynamic(
  () => import('@/components/ui/FooterAction').then((mod) => ({ default: mod.FooterAction })),
  { ssr: false },
);
import { PushNotificationPrompt } from '@/components/ui/PushNotificationPrompt';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import {
  shouldShowMobileFooter,
  shouldShowCityEarlyAccessNavbar,
  shouldShowSubpageAction,
  getPageType,
} from '@/utils/navigationUtils';

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
  const [isMounted, setIsMounted] = useState(false);

  // Track when component has mounted to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check feature flag on client-side only (use state to avoid webpack evaluation issues)
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [forceMobileFooter, setForceMobileFooter] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAppLaunched(getFeatureFlag('isAppLaunched'));
      setForceMobileFooter(getFeatureFlag('forceMobileFooter'));
    }
  }, []);

  // Get app stage to determine navigation (Stage 3 can be from isAppLaunched or provider count >= 15)
  const { stage } = useAppStage();

  // Use utility functions for cleaner logic
  const pageType = getPageType(pathname);
  const { isLandingPage } = pageType;

  // Determine what UI elements should be shown (both computed always; slot is always in DOM to prevent layout shift)
  const showMobileFooter = shouldShowMobileFooter(
    pathname,
    isSplashVisible,
    user,
    isAppLaunched,
    stage,
  );
  const showCityEarlyAccessNavbar = shouldShowCityEarlyAccessNavbar(
    pathname,
    isSplashVisible,
    isAppLaunched,
    user,
    stage,
  );
  const showSubpageAction = shouldShowSubpageAction(pathname);

  // Root discovery home must always show the bottom navbar once stage is resolved.
  const isDiscoveryHome = pathname === '/' && (stage === 'stage2' || stage === 'stage3');
  // Providers listing is the primary discovery surface and must always show bottom nav on mobile.
  const isProvidersDiscovery =
    pathname === '/providers' || pathname === '/food' || pathname === '/stores' || pathname === '/ummah';

  // When not yet mounted use 'none' so slot reserves space without showing wrong UI; after mount show correct one
  const mobileUiMode = !isMounted
    ? 'none'
    : forceMobileFooter
      ? 'footer'
    : isDiscoveryHome || isProvidersDiscovery || pathname === '/saved' || pathname === '/profile' || pathname === '/chat' || pathname === '/login' || pathname === '/signup'
      ? 'footer'
    : showMobileFooter
      ? 'footer'
      : showCityEarlyAccessNavbar
        ? 'navbar'
        : 'none';

  // Debug logging for footer visibility (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.log('[RootClientLayout] Footer Debug:', {
        pathname,
        isSplashVisible,
        isAppLaunched,
        forceMobileFooter,
        stage,
        isDiscoveryHome,
        isProvidersDiscovery,
        showMobileFooter,
        user: user ? 'authenticated' : 'not authenticated',
      });
    }
  }, [pathname, isSplashVisible, isAppLaunched, forceMobileFooter, stage, isDiscoveryHome, isProvidersDiscovery, showMobileFooter, user]);

  return (
    <LoadingProvider>
      <div className="page-background h-screen-fix relative flex flex-col">
        {/* Dev-only: ensure no service worker interferes with HMR/chunks (only on localhost) */}
        {process.env.NODE_ENV === 'development' &&
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1') && <DevServiceWorkerReset />}
        {/* Auto-register service worker for PWA */}
        <ServiceWorkerRegistration />
        {/* Mobile Header - Above all content, edge-to-edge */}
        {isLandingPage && (
          <div className="block md:hidden">
            {/* Header will be rendered by MobileSplashScreen or AboutPageContent */}
          </div>
        )}

        <main ref={mainRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>

        {/* Desktop Footer */}
        <div className="relative z-10 hidden flex-shrink-0 md:block">
          <DesktopFooter />
        </div>

        {/* Mobile bottom UI slot: always in DOM with reserved height to prevent layout shift; visibility controlled by CSS */}
        <div
          className="mobile-bottom-ui-slot block md:hidden"
          data-mobile-ui={mobileUiMode}
          data-testid="mobile-footer-bar"
        >
          <div className="mobile-footer-bar-wrapper">
            <MobileFooterBar />
          </div>
          <div className="city-navbar-wrapper">
            <CityEarlyAccessNavbar />
          </div>
        </div>

        {/* Action button for subpages */}
        {showSubpageAction && (
          <FooterAction
            actionButton={{
              label:
                pathname === '/signup/check-email'
                  ? t('signup.afterConfirmationLogin')
                  : t('common.next'),
              icon: 'material-symbols:chevron-right',
              onClick: () => {
                if (pathname === '/signup/check-email') {
                  router.push('/login');
                } else {
                  router.back();
                }
              },
              variant: 'primary',
              'aria-label':
                pathname === '/signup/check-email'
                  ? t('signup.afterConfirmationLogin')
                  : t('common.next'),
            }}
          />
        )}

        {/* Push Notification Prompt */}
        {process.env.NODE_ENV === 'production' && (
          <PushNotificationPrompt autoShow={true} showDelay={5000} />
        )}

        {/* Chat Floating Widget (Desktop) */}
        <ChatFloatingWidget />
      </div>
    </LoadingProvider>
  );
}

function DevServiceWorkerReset() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      // Clear any runtime caches created by SW
      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => keys.forEach((k) => caches.delete(k)))
          .catch(() => {});
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
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
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
        })
        .catch((error) => {
          // Handle errors when checking registrations
          console.error('❌ Failed to check service worker registrations:', error);
        });
    }
  }, []);
  return null;
}
