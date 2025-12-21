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
  const { user, isLoading } = useAuth();
  const { formData, setCreationMode } = useFormData();
  const { t } = useLanguage();

  // Use centralized mobile detection
  const isMobile = useIsSmallMobile();

  // Set creation mode to 'owner' if not already set (recommendation mode is set by /recommend-provider route)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:33',message:'useEffect: Checking creation mode on mount',data:{currentMode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (formData.creationMode !== 'recommendation') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:35',message:'useEffect: Setting mode to owner',data:{previousMode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setCreationMode('owner');
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:39',message:'useEffect: Mode is already recommendation, not changing',data:{mode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
  // Authentication check - redirect to login with return URL (unless recommendation mode)
  const isRecommendationMode = formData.creationMode === 'recommendation';
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
  // In recommendation mode, use router.back() to return to previous page (early access screen)
  // In owner mode, navigate to /create selection page
  const handleBack = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:104',message:'handleBack called',data:{creationMode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (formData.creationMode === 'recommendation') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:106',message:'Calling router.back() - recommendation mode',data:{mode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      router.back();
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create/basics/page.tsx:109',message:'Navigating to /create - owner mode',data:{mode:formData.creationMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
              router.push('/create/location');
            }}
          />
        ) : (
          <UnifiedProviderCreateForm />
        )}
      </PageContent>
    </Layout>
  );
}