'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { PageTransition } from '@/components/ui/PageTransition';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';

interface RootClientLayoutProps {
  children: ReactNode;
}

export function RootClientLayout({ children }: RootClientLayoutProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isAboutPage = pathname === '/about';
  const isProviderDetailPage = pathname.startsWith('/providers/') && pathname !== '/providers';
  const isCategoryPage = pathname === '/create/category';
  const isOffersPage = pathname === '/create/offers';
  const isNeedsPage = pathname === '/create/needs';
  const isMediaPage = pathname === '/create/media';
  const { isSplashVisible } = useSplash();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const logLayoutState = () => {
      if (!mainRef.current) return;

      const mainRect = mainRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const bodyHeight = document.body.scrollHeight;
      const mainHeight = mainRect.height;
      const mainBottom = mainRect.bottom;

      console.group('RootClientLayout - Layout State');
      console.log('Navigation:', {
        pathname,
        isLandingPage,
        timestamp: new Date().toISOString(),
      });
      console.log('Dimensions:', {
        viewportHeight,
        documentHeight,
        bodyHeight,
        mainHeight,
        mainBottom,
        mainBottomToViewport: viewportHeight - mainBottom,
      });
      console.log('Main Element:', {
        offsetHeight: mainRef.current.offsetHeight,
        clientHeight: mainRef.current.clientHeight,
        scrollHeight: mainRef.current.scrollHeight,
      });
      console.groupEnd();
    };

    // Log on mount and path changes
    logLayoutState();

    // Log on resize
    window.addEventListener('resize', logLayoutState);

    return () => {
      window.removeEventListener('resize', logLayoutState);
    };
  }, [pathname, isLandingPage]);

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
            <div className="h-full bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
              {children}
            </div>
          </PageTransition>
        </main>
        {!isAboutPage && !isProviderDetailPage && !isCategoryPage && !isOffersPage && !isNeedsPage && !isMediaPage && !isSplashVisible && (
          <div className="block md:hidden">
            <MobileFooterBar />
          </div>
        )}
      </div>
    </LoadingProvider>
  );
}
