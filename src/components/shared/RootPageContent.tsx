'use client';

import { useEffect, useState } from 'react';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { useAppStage } from '@/hooks/useAppStage';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { Stage2Content } from './Stage2Content';
import { CategoryGallerySection } from './CategoryGallerySection';
import { MobileGreetingHeader } from './MobileGreetingHeader';
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
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Show stage-based content if user has completed onboarding (early access + city selected)
  if (shouldShowCityContent && selectedCity) {
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
        <div className="flex min-h-screen w-full flex-col bg-uflow-light">
          {/* Greeting Header - Fixed at top (matches Stage 2 style) */}
          <header 
            className="fixed left-0 right-0 top-0 z-50 sm:hidden"
            style={{
              // Smooth transition for all properties including backdrop-filter
              transition: 'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
              // Glassy blur effect - always applied for consistent visual effect
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
              className="px-6 py-4 text-left"
              style={{
                // Add safe area padding to content, not header background
                // Use max() to ensure minimum 24px padding on devices without safe area (like iPhone SE)
                paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
              }}
            >
              <div className="max-w-72">
                <MobileGreetingHeader cityName={displayCity} />
              </div>
            </div>
          </header>

          {/* Category Gallery - Below header with proper spacing */}
          <div className="w-full pt-[calc(env(safe-area-inset-top)+80px+32px)] px-6">
            <CategoryGallerySection />
          </div>
        </div>
      );
    }

    // Show loading state while stage is being determined
    if (stage === 'loading' && displayCity) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      );
    }

    // Fallback: Show Stage 1 if stage is not determined yet (should not happen in normal flow)
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

