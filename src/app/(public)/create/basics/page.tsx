'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { Button, IconWithTitle, Icon } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';

export default function CreateBasicsPage() {
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { formData, setCreationMode } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();

  // Set creation mode once on mount if not already set to recommendation
  useEffect(() => {
    // Only set to 'owner' if it's not already 'recommendation'
    // (which would have been set by the /recommend-provider route)
    if (formData.creationMode !== 'recommendation') {
      setCreationMode('owner');
    }
    // Only run once on mount - don't include formData.creationMode in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCreationMode]);

  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // Desktop redirect
  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.basics.desktopMessage')}
        </span>
      </div>
    );
  }

  // Authentication check - redirect to login with return URL
  if (!user) {
    const returnUrl = encodeURIComponent('/create/basics');
    
    return (
      <PageLayout hasBackground={false} maxWidth="xs">
        <PageHeader 
          title={t('create.basics.title')}
          variant="title-only"
        />

        <HeaderSpacer />

        <PageContentWrapper centerVertically={true} maxWidth="xs">
          <div className="flex w-full flex-col">
            <TitleSection className="mb-10">
              <IconWithTitle
                icon={<Icon className="w-full h-full text-content-title" icon="material-symbols:lock-outline" />}
                size="large"
                title={t('create.basics.loginRequired')}
              >
                <p className="text-center text-base leading-normal text-content mt-2">
                  {t('create.basics.loginDescription')}
                </p>
              </IconWithTitle>
            </TitleSection>

            <ContentSection>
              <div className="flex flex-col space-y-3">
                <Button
                  fullWidth
                  type="button"
                  variant="auth"
                  onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
                >
                  {t('create.basics.goToLogin')}
                </Button>
              </div>
            </ContentSection>
          </div>
        </PageContentWrapper>
      </PageLayout>
    );
  }

  return (
    <PageLayout hasBackground={false} maxWidth="xs">
      <PageHeader 
        isVisible={isHeaderSticky}
        title={t('create.basics.title')}
        variant="back-and-title"
        onBack={() => router.push('/create')}
      />

      <HeaderSpacer isVisible={isHeaderSticky} />

      <PageContentWrapper maxWidth="xs">
        <ProviderCreateForm 
          onNextStep={() => {
            // Navigate to location page
            router.push('/create/location');
          }}
        />
      </PageContentWrapper>
    </PageLayout>
  );
}