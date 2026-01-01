'use client';

import { useEffect, useState } from 'react';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';
import { CityEarlyAccessEmptyState } from './CityEarlyAccessEmptyState';
import { AboutSection } from './AboutSection';
import { DesktopWaitlistSection } from './DesktopWaitlistSection';
import { ExploreSection } from './ExploreSection';
import { LandingHero } from './LandingHero';
import { MobileSplashScreen } from './MobileSplashScreen';
import { toast } from 'sonner';

/**
 * RootPageContent Component
 * 
 * Client component that conditionally renders:
 * - CityEarlyAccessEmptyState if user has completed onboarding (earlyAccessUnlocked + city selected)
 * - Waitlist/onboarding content if user hasn't completed onboarding
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
  if (shouldShowCityContent === null || isRecovering) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-content-muted">Loading...</div>
      </div>
    );
  }

  // Show City Page Content if user has completed onboarding (early access + city selected)
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

    return (
      <CityEarlyAccessEmptyState
        cityName={selectedCity}
        onReceiveUpdates={handleReceiveUpdates}
      />
    );
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

