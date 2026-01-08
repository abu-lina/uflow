'use client';

import { useEffect, useState } from 'react';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { Stage2Content } from './Stage2Content';
import { CategoryGallerySection } from './CategoryGallerySection';
import { AboutSection } from './AboutSection';
import { DesktopWaitlistSection } from './DesktopWaitlistSection';
import { ExploreSection } from './ExploreSection';
import { LandingHero } from './LandingHero';
import { MobileSplashScreen } from './MobileSplashScreen';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

/**
 * RootPageContent Component
 * 
 * Client component that conditionally renders based on app stage:
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2 (6-14 providers): Stage2Content (CityCard + provider list)
 * - Stage 3 (15+ providers): CategoryGallerySection
 * - Onboarding: Waitlist/onboarding content
 * 
 * Onboarding is complete when:
 * 1. earlyAccessUnlocked = true (user has joined waitlist)
 * 2. A city is selected (stored in localStorage/sessionStorage)
 * 
 * This ensures proper client-side state checking and conditional rendering.
 */
export function RootPageContent() {
  const [shouldShowCityContent, setShouldShowCityContent] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Get app stage to determine which content to show
  const { stage, cityName, isLoading: stageLoading } = useAppStage();
  
  // #region agent log
  console.log('[DEBUG] RootPageContent component render', { stage, cityName, stageLoading, shouldShowCityContent, selectedCity, isRecovering });
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootPageContent.tsx:39',message:'RootPageContent component render',data:{stage,cityName,stageLoading,shouldShowCityContent,selectedCity,isRecovering},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  useEffect(() => {
    // Check if waitlist should be skipped
    const skipWaitlist = getFeatureFlag('skipWaitlist');
    
    // Check onboarding state client-side
    const onboardingState = getOnboardingState();
    const hasEarlyAccess = skipWaitlist ? true : (onboardingState?.earlyAccessUnlocked ?? false);
    
    // Check if city is selected
    const cityFromStorage = typeof window !== 'undefined'
      ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
      : null;
    
    // RECOVERY: If city is selected but onboarding state is missing
    if (!hasEarlyAccess && cityFromStorage) {
      if (skipWaitlist) {
        // When waitlist is skipped, create minimal onboarding state directly
        setOnboardingState({
          email: '',
          waitlistSubmitted: false,
          earlyAccessUnlocked: true,
          submittedAt: new Date().toISOString(),
        });
        setSelectedCity(cityFromStorage);
        setShouldShowCityContent(true);
        return;
      }
      
      // When waitlist is not skipped, check API (uses HTTP-only cookie)
      setIsRecovering(true);
      
      // Check API to restore onboarding state (API uses HTTP-only cookie, more reliable)
      fetch('/api/waitlist/status')
        .then((response) => response.json())
        .then((data: { data?: { email?: string; selected_city?: string | null } | null; error?: { message: string } | null }) => {
          if (data.error) {
            console.error('[RootPageContent] Recovery: API error:', data.error);
            setShouldShowCityContent(false);
            return;
          }
          
          if (data.data?.email) {
            // User has valid waitlist entry (via cookie) - restore onboarding state
            setOnboardingState({
              email: data.data.email,
              waitlistSubmitted: true,
              earlyAccessUnlocked: true,
              submittedAt: new Date().toISOString(),
            });
            setSelectedCity(cityFromStorage);
            setShouldShowCityContent(true);
          } else {
            // No waitlist entry found - cookie expired or user bypassed waitlist
            console.warn('[RootPageContent] Recovery: No waitlist entry found. Showing onboarding.');
            setShouldShowCityContent(false);
          }
        })
        .catch((error) => {
          console.error('[RootPageContent] Recovery: API check failed:', error);
          // On error, show onboarding (safe fallback)
          setShouldShowCityContent(false);
        })
        .finally(() => {
          setIsRecovering(false);
        });
      
      return; // Wait for recovery to complete
    }
    
    // Show city content if user has completed onboarding
    // When skipWaitlist is true: only check for city selection (ignore earlyAccess requirement)
    // When skipWaitlist is false: require both earlyAccess and city selection
    const hasCompletedOnboarding = skipWaitlist 
      ? cityFromStorage !== null 
      : hasEarlyAccess && cityFromStorage !== null;
    
    setSelectedCity(cityFromStorage);
    setShouldShowCityContent(hasCompletedOnboarding);
  }, []);

  // #region agent log
  console.log('[DEBUG] RootPageContent render check', { shouldShowCityContent, selectedCity, isRecovering, stageLoading, stage, cityName, willShowStageContent: shouldShowCityContent && selectedCity });
  fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootPageContent.tsx:122',message:'RootPageContent render check',data:{shouldShowCityContent,selectedCity,isRecovering,stageLoading,stage,cityName,willShowStageContent:shouldShowCityContent && selectedCity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  // Wait for client-side check or recovery to complete
  if (shouldShowCityContent === null || isRecovering || stageLoading) {
    // #region agent log
    console.log('[DEBUG] RootPageContent early return', { shouldShowCityContent, isRecovering, stageLoading, stage, cityName });
    fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootPageContent.tsx:132',message:'RootPageContent early return',data:{shouldShowCityContent,isRecovering,stageLoading,stage,cityName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Show stage-based content if user has completed onboarding (early access + city selected)
  if (shouldShowCityContent && selectedCity) {
    // #region agent log
    console.log('[DEBUG] RootPageContent will render stage content', { stage, shouldShowCityContent, selectedCity, cityName });
    fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootPageContent.tsx:144',message:'RootPageContent will render stage content',data:{stage,shouldShowCityContent,selectedCity,cityName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    // Handle receive updates subscription
    const handleReceiveUpdates = async () => {
      try {
        const onboardingState = getOnboardingState();
        const email = onboardingState?.email || '';
        const waitlistToken = onboardingState?.waitlistToken || '';

        if (!email) {
          throw new Error('Email not found');
        }

        const response = await fetch('/api/waitlist/subscribe-city', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            cityName: selectedCity,
            waitlistToken: waitlistToken || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error?.message || 'Failed to subscribe');
        }

        toast.success(`You'll receive updates about ${selectedCity}!`);
      } catch (err) {
        console.error('[RootPageContent] Failed to subscribe:', err);
        toast.error('Failed to subscribe. Please try again.');
        throw err;
      }
    };

    // Render content based on app stage
    // Use cityName from useAppStage hook (more reliable than selectedCity state)
    const displayCity = cityName || selectedCity;

    // #region agent log
    console.log('[DEBUG] RootPageContent render', { stage, cityName, selectedCity, displayCity });
    fetch('http://127.0.0.1:7243/ingest/4249d676-8d92-4f4e-ae7e-d21860c8f1e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RootPageContent.tsx:174',message:'RootPageContent render',data:{stage,cityName,selectedCity,displayCity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Stage 1: Early Access Empty State (0-5 providers)
    if (stage === 'stage1' && displayCity) {
      return (
        <CityEarlyAccessEmptyState
          cityName={displayCity}
          onReceiveUpdates={handleReceiveUpdates}
        />
      );
    }

    // Stage 2: City Card + Provider List (6-14 providers)
    if (stage === 'stage2' && displayCity) {
      return <Stage2Content cityName={displayCity} />;
    }

    // Stage 3: Category Gallery (15+ providers or isAppLaunched)
    if (stage === 'stage3') {
      return (
        <div className="min-h-screen w-full bg-uflow-light">
          <div className="pt-safe-top">
            <CategoryGallerySection />
          </div>
        </div>
      );
    }

    // Fallback: Show Stage 1 if stage is not determined yet
    if (displayCity) {
      return (
        <CityEarlyAccessEmptyState
          cityName={displayCity}
          onReceiveUpdates={handleReceiveUpdates}
        />
      );
    }
  }

  // Show waitlist/onboarding content if onboarding is not complete
  return (
    <>
      {/* Mobile Content */}
      <div className="md:hidden">
        <MobileSplashScreen />
      </div>

      {/* Desktop Landing Content */}
      <div className="relative z-10 hidden md:block">
        <LandingHero />
        <AboutSection />
        <DesktopWaitlistSection />
        <ExploreSection />
      </div>
    </>
  );
}

