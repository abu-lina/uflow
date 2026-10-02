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

  // Reset scroll position on navigation. The real scroller is <main>, not window,
  // so Next.js scroll={false} on Links has no effect. Snap instantly (no smooth).
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Check feature flag on client-side only (use state to avoid webpack evaluation issues)
  const [isAppLaunched, setIsAppLaunched] = useState(false);
  const [forceMobileFooter, setForceMobileFooter] = useState(false);
  const [enableChatbot, setEnableChatbot] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAppLaunched(getFeatureFlag('isAppLaunched'));
      setForceMobileFooter(getFeatureFlag('forceMobileFooter'));
      setEnableChatbot(getFeatureFlag('enableChatbot'));
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
  // Discovery pages are the primary browsing surfaces and must always show bottom nav on mobile.
  const isFoodDiscovery = pathname === '/food' || pathname === '/stores' || pathname === '/ummah';

  // When not yet mounted use 'none' so slot reserves space without showing wrong UI; after mount show correct one
  const mobileUiMode = !isMounted
    ? 'none'
    : forceMobileFooter
      ? 'footer'
      : isDiscoveryHome ||
          isFoodDiscovery ||
          pathname === '/saved' ||
          pathname === '/profile' ||
          pathname === '/login' ||
          pathname === '/signup'
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
        isFoodDiscovery,
        showMobileFooter,
        user: user ? 'authenticated' : 'not authenticated',
      });
    }
  }, [
    pathname,
    isSplashVisible,
    isAppLaunched,
    forceMobileFooter,
    stage,
    isDiscoveryHome,
    isFoodDiscovery,
    showMobileFooter,
    user,
  ]);

  return (
    <div className="page-background h-screen-fix relative flex flex-col">
      {/* Registers the service worker. Since request 282 this is the ONLY
          registration path: @ducanh2912/next-pwa's `register: true` injected a
          client-side registration, and @serwist/next's configurator mode injects
          nothing into the client bundle at all. */}
      <ServiceWorkerRegistration />
      {/* Mobile Header - Above all content, edge-to-edge */}
      {isLandingPage && (
        <div className="block md:hidden">
          {/* Header will be rendered by MobileSplashScreen or AboutPageContent */}
        </div>
      )}

      <main ref={mainRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none">
        <PageTransition>{children}</PageTransition>
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

      {/* Chat Floating Widget (Desktop) — gated by enableChatbot feature flag */}
      {enableChatbot && <ChatFloatingWidget />}
    </div>
  );
}

// There is deliberately no DevServiceWorkerReset any more.
//
// It used to unregister every service worker and delete every cache on mount in
// development, to stop a stale worker interfering with HMR. Registration is now
// gated on NODE_ENV === 'production', so `next dev` never holds a worker and
// there is nothing left for it to clean. Keeping it would repeat the mistake
// request 281 was written about: a blind unregister-and-wipe remediation that
// outlived its cause.

function ServiceWorkerRegistration() {
  useEffect(() => {
    // Gated on NODE_ENV, not on hostname.
    //
    // The old gate was `hostname is not localhost/127.0.0.1`, which looked
    // equivalent but is not: `next start` on a local production build serves
    // 127.0.0.1, so a hostname gate means the generated public/sw.js can only
    // ever be exercised in Docker or on UAT. e2e/sw-session-boundary.spec.ts
    // (the request 281 regression guard) runs a production build against
    // 127.0.0.1 and asserts `registrations > 0` as its precondition, so a
    // hostname gate would make it fail outright. NODE_ENV keeps `next dev`
    // worker-free while letting local production builds register.
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Called unconditionally, with no getRegistrations() pre-check.
    //
    // register() is idempotent: calling it with the same scope and scriptURL
    // does not restart installation, and it is the documented way to pick up an
    // updated worker. The old `registrations.length === 0` guard meant a client
    // that already had a worker never re-registered, so this path could never
    // deliver an update. That was merely redundant while next-pwa injected its
    // own registration; now that this is the only path, it is harmful.
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Logged in all environments: a failure here means no push notifications
      // and no offline fallback, with no other symptom.
      console.error('❌ Service Worker registration failed:', error);
    });
  }, []);
  return null;
}
