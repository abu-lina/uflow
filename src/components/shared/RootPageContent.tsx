'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { getHomeRedirectPath } from '@/config/sectionFilters';
import { useAppStage } from '@/hooks/useAppStage';
import { useOnboardingGate } from '@/hooks/useOnboardingGate';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
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
 * Client component that conditionally renders based on device type and app stage:
 *
 * Desktop (md: and above):
 * - Shows landing page content (LandingHero, AboutSection, ExploreSection)
 *   until onboarding completes with stage 2/3, then redirects like mobile
 *
 * Mobile (below md:):
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2/3 (6+ providers): replaced by the active section route (#674);
 *   map and list live there, not on /
 * - Onboarding: Waitlist/onboarding content (MobileSplashScreen)
 *
 * Onboarding is complete when:
 * 1. earlyAccessUnlocked = true (user has joined waitlist)
 * 2. A city is selected (stored in localStorage/sessionStorage)
 *
 * This ensures proper client-side state checking and conditional rendering.
 */
export function RootPageContent() {
  const { ready: shouldShowCityContent, city: selectedCity, isRecovering } = useOnboardingGate();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get app stage to determine which content to show
  const { stage, cityName, isLoading: stageLoading } = useAppStage();

  // Use cityName from useAppStage hook (more reliable than selectedCity state)
  const displayCity = cityName || selectedCity;

  // #674: discovery lives on the section route. Once onboarding is complete
  // and the city has enough providers, hand off with the query string intact.
  const showsDiscovery =
    !!shouldShowCityContent && !!displayCity && (stage === 'stage2' || stage === 'stage3');
  const query = searchParams.toString();
  useEffect(() => {
    if (showsDiscovery) router.replace(getHomeRedirectPath(new URLSearchParams(query)));
  }, [showsDiscovery, query, router]);

  // Wait for client-side check or recovery to complete, or for the hand-off
  if (shouldShowCityContent === null || isRecovering || stageLoading || showsDiscovery) {
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
  // Desktop: Show landing page content (stage 2/3 already handed off above)
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
            {stage !== 'stage1' &&
              stage !== 'stage2' &&
              stage !== 'stage3' &&
              stage !== 'loading' && (
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
