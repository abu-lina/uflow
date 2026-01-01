'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOnboardingState } from '@/lib/utils/onboarding-state';

/**
 * Client component that redirects to selected city page if:
 * 1. User has completed onboarding (earlyAccessUnlocked)
 * 2. User has a selected city stored in localStorage
 * 
 * This ensures users return to their city page when reopening the app
 */
export function CityHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingState = getOnboardingState();
    
    if (onboardingState?.earlyAccessUnlocked) {
      // Check for selected city in localStorage (preferred) or sessionStorage (fallback)
      const selectedCity = 
        typeof window !== 'undefined' 
          ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
          : null;

      if (selectedCity) {
        // Redirect to city page - it will handle provider count check and show appropriate screen
        router.replace(`/city/${encodeURIComponent(selectedCity)}`);
      }
    }
  }, [router]);

  // This component doesn't render anything - it only handles redirects
  return null;
}


