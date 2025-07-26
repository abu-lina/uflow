'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { PageTransition } from '@/components/ui/PageTransition';
import { LoadingProvider } from '@/providers/LoadingProvider';

interface RootClientLayoutProps {
  children: ReactNode;
}

export function RootClientLayout({ children }: RootClientLayoutProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
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
      <div className="relative flex min-h-[100dvh] flex-col">
        <main ref={mainRef} className="flex-1 overflow-y-auto pb-[64px] md:pb-0">
          <PageTransition key={pathname}>
            {isLandingPage ? (
              children
            ) : (
              <div className="min-h-full bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
                {children}
              </div>
            )}
          </PageTransition>
        </main>
        <div className="block md:hidden">
          <MobileFooterBar />
        </div>
      </div>
    </LoadingProvider>
  );
}
