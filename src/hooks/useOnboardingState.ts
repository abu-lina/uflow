'use client';

import { useState, useEffect } from 'react';
import {
  getOnboardingState,
  setOnboardingState,
  clearOnboardingState,
  type OnboardingState,
} from '@/lib/utils/onboarding-state';

/**
 * React hook for managing onboarding state
 * 
 * Provides a React-friendly interface to the onboarding state utility
 * with automatic re-rendering when state changes
 */
export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load state on mount
  useEffect(() => {
    const loadState = () => {
      const currentState = getOnboardingState();
      setState(currentState);
      setIsLoading(false);
    };

    loadState();
  }, []);

  /**
   * Unlock early access for the user
   */
  const unlockEarlyAccess = (email: string, waitlistToken?: string) => {
    const newState: OnboardingState = {
      email,
      waitlistSubmitted: true,
      earlyAccessUnlocked: true,
      submittedAt: new Date().toISOString(),
      waitlistToken,
    };
    
    setOnboardingState(newState);
    setState(newState);
  };

  /**
   * Reset the onboarding state
   * Use this only for explicit resets (e.g., user clears data)
   */
  const resetOnboarding = () => {
    clearOnboardingState();
    setState(null);
  };

  /**
   * Update specific fields in the state
   */
  const updateState = (updates: Partial<OnboardingState>) => {
    if (!state) {
      console.warn('[useOnboardingState] Cannot update - no existing state');
      return;
    }

    const newState = { ...state, ...updates };
    setOnboardingState(newState);
    setState(newState);
  };

  return {
    // State values
    hasJoinedWaitlist: state?.waitlistSubmitted ?? false,
    earlyAccessUnlocked: state?.earlyAccessUnlocked ?? false,
    email: state?.email ?? null,
    waitlistToken: state?.waitlistToken ?? null,
    submittedAt: state?.submittedAt ?? null,
    
    // Loading state
    isLoading,
    
    // Actions
    unlockEarlyAccess,
    resetOnboarding,
    updateState,
    
    // Raw state (for advanced usage)
    state,
  };
}

