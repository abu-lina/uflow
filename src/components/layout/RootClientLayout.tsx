'use client';

import { ReactNode, useEffect, useRef } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { MobileFooterBar } from '@/components/common/MobileFooterBar';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/Button';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { useSplash } from '@/providers/splash-provider';
import { useAuth } from '@/hooks/useAuth';

interface RootClientLayoutProps {
  children: ReactNode;
}

export function RootClientLayout({ children }: RootClientLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isLandingPage = pathname === '/';
  const isAboutPage = pathname === '/about';
  const isProviderDetailPage = (pathname.startsWith('/providers/') && pathname !== '/providers') || pathname.startsWith('/profile/providers/');
  const isCategoryPage = pathname === '/create/basics/category';
  const { isSplashVisible } = useSplash();
  const mainRef = useRef<HTMLElement>(null);

  // Check if this is a subpage that should show an action button instead of navbar
  const isSubpage = pathname === '/signup/check-email' || 
                   pathname.includes('/signup/') && pathname !== '/signup' ||
                   pathname.includes('/login/') && pathname !== '/login' ||
                   pathname.includes('/profile/') && pathname !== '/profile'; // Extended pattern for subpages

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
        
        <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </main>
        {!isAboutPage && !isProviderDetailPage && !isCategoryPage && !isSplashVisible && !isSubpage && !pathname.includes('/create/media/images') && !pathname.includes('/create/media/social') && !(user && pathname.startsWith('/create') && pathname !== '/create') && !pathname.includes('/profile/edit') && !pathname.includes('/profile/delete') && !pathname.includes('/profile/providers/') && (
          <div className="block md:hidden">
            <MobileFooterBar />
          </div>
        )}

        {/* Action button for subpages */}
        {isSubpage && (
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
                    {pathname === '/signup/check-email' ? 'Nach Bestätigung anmelden' : 'Weiter'}
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
