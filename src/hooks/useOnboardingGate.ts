'use client';

import { useEffect, useState } from 'react';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';
import { getFeatureFlag } from '@/config/feature-flags';

export interface OnboardingGateResult {
  /** null = still resolving, true = onboarding complete, false = show onboarding */
  ready: boolean | null;
  /** Selected city from localStorage/sessionStorage, null when not yet resolved */
  city: string | null;
  /** True while the waitlist recovery API call is in-flight */
  isRecovering: boolean;
}

/**
 * useOnboardingGate -- resolves whether the user has completed onboarding.
 *
 * Checks feature flags, localStorage/sessionStorage, and (when needed) the
 * waitlist status API to determine if the user should see city content or the
 * onboarding/waitlist flow.
 *
 * Extracted from RootPageContent to make the logic independently testable
 * without rendering or mocking 14 unrelated UI dependencies.
 */
export function useOnboardingGate(): OnboardingGateResult {
  const [ready, setReady] = useState<boolean | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // When app is fully launched, bypass all onboarding/city gates
    const isAppLaunched = getFeatureFlag('isAppLaunched');
    if (isAppLaunched) {
      setReady(true);
      return;
    }

    // Check if waitlist should be skipped
    const skipWaitlist = getFeatureFlag('skipWaitlist');

    // Check onboarding state client-side
    const onboardingState = getOnboardingState();
    const hasEarlyAccess = skipWaitlist ? true : (onboardingState?.earlyAccessUnlocked ?? false);

    // Check if city is selected
    const cityFromStorage =
      typeof window !== 'undefined'
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
        setCity(cityFromStorage);
        setReady(true);
        return;
      }

      // When waitlist is not skipped, check API (uses HTTP-only cookie)
      setIsRecovering(true);

      // Check API to restore onboarding state (API uses HTTP-only cookie, more reliable)
      fetch('/api/waitlist/status')
        .then((response) => response.json())
        .then(
          (data: {
            data?: { email?: string; selected_city?: string | null } | null;
            error?: { message: string } | null;
          }) => {
            if (data.error) {
              console.error('[useOnboardingGate] Recovery: API error:', data.error);
              setReady(false);
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
              setCity(cityFromStorage);
              setReady(true);
            } else {
              // No waitlist entry found - cookie expired or user bypassed waitlist
              console.warn(
                '[useOnboardingGate] Recovery: No waitlist entry found. Showing onboarding.',
              );
              setReady(false);
            }
          },
        )
        .catch((error) => {
          console.error('[useOnboardingGate] Recovery: API check failed:', error);
          // On error, show onboarding (safe fallback)
          setReady(false);
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

    setCity(cityFromStorage);
    setReady(hasCompletedOnboarding);
  }, []);

  return { ready, city, isRecovering };
}
