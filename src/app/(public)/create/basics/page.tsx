'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { UnifiedProviderCreateForm } from '@/features/providers/UnifiedProviderCreateForm';
import { Button } from '@/components/ui/Button';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function CreateBasicsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { formData, setCreationMode, isLoading: isFormDataLoading } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();
  
  const isLoading = isAuthLoading || isFormDataLoading;

  // Set creation mode to 'owner' if not already set (recommendation mode is set by /recommend-provider route)
  // Also check localStorage as fallback in case formData hasn't loaded yet
  useEffect(() => {
    // Check localStorage first to preserve recommendation mode if it was set
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem('providerFormData');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.creationMode === 'recommendation') {
            setCreationMode('recommendation');
            return;
          }
        }
      } catch (e) {
        console.error('[CreateBasicsPage] Error reading localStorage:', e);
      }
    }
    
    // Only set to 'owner' if not already 'recommendation'
    if (formData.creationMode !== 'recommendation') {
      setCreationMode('owner');
    }
    // Only run once on mount - don't include formData.creationMode in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCreationMode]);


  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  // In recommendation mode, allow anonymous users (skip auth check)
  // Check creation mode from formData (loaded from localStorage)
  // Also check localStorage directly as a fallback in case formData hasn't loaded yet
  const getCreationMode = (): 'owner' | 'recommendation' => {
    if (formData.creationMode === 'recommendation') return 'recommendation';
    // Fallback: check localStorage directly
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem('providerFormData');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.creationMode === 'recommendation') return 'recommendation';
        }
      } catch {
        // Ignore errors
      }
    }
    return 'owner';
  };
  
  const isRecommendationMode = getCreationMode() === 'recommendation';
  
  // Authentication check - redirect to login with return URL (unless recommendation mode)
  // Only check after formData has had a chance to load
  if (!user && !isRecommendationMode) {
    const returnUrl = encodeURIComponent('/create/basics');
    
    return (
      <Layout>
        <PageHeader
          title={t('create.basics.title')}
        />

        <PageContent 
          className={cn(
            'flex items-center justify-center min-h-[60vh]',
            !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
          )}
          maxWidth="full"
          paddingX={isMobile ? 'px-6' : 'px-0'}
        >
          <div className="flex w-full flex-col">
            <TitleSection className="mb-10">
              <IconWithTitle
                icon={<Icon className="w-full h-full text-content-heading" icon="material-symbols:lock-outline" />}
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
        </PageContent>
      </Layout>
    );
  }

  // Determine back button handler based on creation mode
  // In recommendation mode, navigate to root (/) which will show early access screen
  // In owner mode, navigate to /create selection page
  const handleBack = () => {
    if (formData.creationMode === 'recommendation') {
      // Navigate to root - MobileSplashScreen will detect early access state from localStorage
      // and show EarlyAccessScreen automatically
      router.push('/');
    } else {
      router.push('/create');
    }
  };

  return (
    <Layout>
      <PageHeader
        title={t('create.basics.title')}
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent 
        className={cn(
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        {isMobile ? (
          <ProviderCreateForm 
            onNextStep={() => {
              // Navigate to location page
              // Use replace in recommendation mode to avoid back button issues
              // Check both formData and localStorage to ensure we have the correct mode
              const checkRecommendationMode = (): boolean => {
                if (formData.creationMode === 'recommendation') return true;
                // Fallback: check localStorage directly
                if (typeof window !== 'undefined') {
                  try {
                    const savedData = localStorage.getItem('providerFormData');
                    if (savedData) {
                      const parsed = JSON.parse(savedData);
                      if (parsed.creationMode === 'recommendation') return true;
                    }
                  } catch (e) {
                    console.error('[CreateBasics] Error reading localStorage:', e);
                  }
                }
                return false;
              };
              
              const isRecommendationMode = checkRecommendationMode();
              
              // Navigate immediately
              if (isRecommendationMode) {
                router.replace('/create/location');
              } else {
                router.push('/create/location');
              }
            }}
          />
        ) : (
          <UnifiedProviderCreateForm />
        )}
      </PageContent>
    </Layout>
  );
}