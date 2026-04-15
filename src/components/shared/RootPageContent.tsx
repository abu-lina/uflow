'use client';

import { useEffect, useState } from 'react';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { Stage2Content } from './Stage2Content';
import { CategoryGallerySection } from './CategoryGallerySection';
import { HomeSearchBar } from '@/features/search/components/HomeSearchBar';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import { AboutSection } from './AboutSection';
import type { Section } from '@/config/sectionFilters';
import { DesktopWaitlistSection } from './DesktopWaitlistSection';
import { ExploreSection } from './ExploreSection';
import { LandingHero } from './LandingHero';
import { MobileSplashScreen } from './MobileSplashScreen';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

/**
 * RootPageContent Component
 * 
 * Client component that conditionally renders based on device type and app stage:
 * 
 * Desktop (md: and above):
 * - Always shows landing page content (LandingHero, AboutSection, ExploreSection)
 * - City stage does not affect desktop view
 * 
 * Mobile (below md:):
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2 (6-14 providers): Stage2Content (CityCard + provider list)
 * - Stage 3 (15+ providers): CategoryGallerySection
 * - Onboarding: Waitlist/onboarding content (MobileSplashScreen)
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
  const [activeSection, setActiveSection] = useState<Section>('food');
  
  // Get app stage to determine which content to show
  const { stage, cityName, isLoading: stageLoading } = useAppStage();

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

  // Wait for client-side check or recovery to complete
  if (shouldShowCityContent === null || isRecovering || stageLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton animate={false} className="h-8 w-48" />
          <Skeleton animate={false} className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Handle receive updates subscription (used for mobile stage-based content)
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

  // Desktop: Always show landing page content regardless of city stage
  // Mobile: Show stage-based content if onboarding complete, otherwise show waitlist
  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const skipWaitlist = getFeatureFlag('skipWaitlist');
  return (
    <>
      {/* Desktop Landing Content - Always shown for desktop users */}
      <div className="relative z-10 hidden md:block">
        <LandingHero />
        <AboutSection />
        {/* Only show waitlist section when app is not launched AND waitlist is not skipped */}
        {!isAppLaunched && !skipWaitlist && <DesktopWaitlistSection />}
        <ExploreSection />
      </div>

      {/* Mobile Content - Stage-based or waitlist based on onboarding state */}
      {/* flex flex-1 flex-col: propagate height from PageTransition so splash centering works (Plan 028) */}
      <div className="flex flex-1 flex-col md:hidden">
        {shouldShowCityContent && displayCity ? (
          // Mobile: Show stage-based content when onboarding is complete
          <>
            {/* Stage 1: Early Access Empty State (0-5 providers) */}
            {stage === 'stage1' && (
              <CityEarlyAccessEmptyState
                cityName={displayCity}
                onReceiveUpdates={handleReceiveUpdates}
              />
            )}

            {/* Stage 2: City Card + Provider List (6-14 providers) */}
            {stage === 'stage2' && <Stage2Content cityName={displayCity} />}

            {/* Stage 3: Category Discovery Home (15+ providers) */}
            {stage === 'stage3' && (
              <div className="flex min-h-screen w-full flex-col bg-uflow-light">
                {/* Fixed header: Search bar + Section selector */}
                <header
                  className="fixed left-0 right-0 top-0 z-50 sm:hidden"
                  style={{
                    transition: 'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
                    isolation: 'isolate',
                    marginLeft: '-1px',
                    marginRight: '-1px',
                    paddingLeft: '1px',
                    paddingRight: '1px',
                  }}
                >
                  <div
                    className="flex flex-col gap-3 px-4 pb-3"
                    style={{
                      paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
                    }}
                  >
                    <HomeSearchBar activeSection={activeSection} />
                    <SectionSelector
                      selectedSection={activeSection}
                      onSectionChange={setActiveSection}
                    />
                  </div>
                </header>

                {/* Scrollable body — offset for fixed header height */}
                {/* Header: safe-area + 24px top pad + ~44px HomeSearchBar + 8px gap = ~76px + safe-area */}
                {/* + ~40px SectionSelector + 12px bottom pad = ~128px + safe-area */}
                <div
                  className="w-full px-4"
                  style={{
                    paddingTop: 'max(136px, calc(env(safe-area-inset-top) + 136px))',
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
                  }}
                >
                  <CategoryGallerySection section={activeSection} />
                </div>
              </div>
            )}

            {/* Show loading state while stage is being determined */}
            {stage === 'loading' && (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            )}

            {/* Fallback: Show Stage 1 if stage is not determined yet */}
            {stage !== 'stage1' && stage !== 'stage2' && stage !== 'stage3' && stage !== 'loading' && (
              <CityEarlyAccessEmptyState
                cityName={displayCity}
                onReceiveUpdates={handleReceiveUpdates}
              />
            )}
          </>
        ) : (
          // Mobile: Show waitlist/onboarding content if onboarding is not complete
          <MobileSplashScreen />
        )}
      </div>
    </>
  );
}

