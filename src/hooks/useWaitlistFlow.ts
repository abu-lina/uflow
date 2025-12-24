'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSplash } from '@/providers/splash-provider';
import {
  getOnboardingState,
  setOnboardingState,
  clearOnboardingState,
} from '@/lib/utils/onboarding-state';

/**
 * Waitlist flow states
 * Represents the different screens/stages in the waitlist onboarding flow
 */
export type WaitlistFlowState =
  | 'loading' // Initial load, checking waitlist status
  | 'splash' // Showing splash screen (first-time users)
  | 'about' // Showing about cards
  | 'waitlist' // Showing waitlist form
  | 'success' // Showing success screen after joining waitlist
  | 'earlyAccess' // Showing early access screen
  | 'aboutFromEarlyAccess'; // About cards from early access context

interface WaitlistFlowData {
  email: string;
  waitlistToken: string;
}

interface WaitlistStatusResponse {
  data: {
    email: string;
    has_seen_early_access: boolean;
    skipped_early_access: boolean;
    selected_city: string | null;
  } | null;
  error: { message: string } | null;
}

/**
 * Hook to manage waitlist flow state machine
 * 
 * Handles:
 * - State transitions
 * - localStorage persistence
 * - API status checking
 * - Flow progression
 */
export function useWaitlistFlow() {
  const { isSplashVisible } = useSplash();
  const [currentState, setCurrentState] = useState<WaitlistFlowState>('loading');
  const [flowData, setFlowData] = useState<WaitlistFlowData>({
    email: '',
    waitlistToken: '',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const isTransitioningRef = useRef(false);
  const hasProgressedRef = useRef(false); // Track if user has explicitly progressed past initial flow

  /**
   * Transition to a new state
   * Includes validation and logging for debugging
   */
  const transitionTo = useCallback((newState: WaitlistFlowState, data?: Partial<WaitlistFlowData>) => {
    if (isTransitioningRef.current) {
      console.warn('[WaitlistFlow] Transition blocked - already transitioning');
      return;
    }

    isTransitioningRef.current = true;

    // Update flow data if provided
    if (data) {
      setFlowData((prev) => ({ ...prev, ...data }));
    }

    // Log state transition for debugging
    console.log('[WaitlistFlow] State transition:', {
      from: currentState,
      to: newState,
      data,
    });

    setCurrentState(newState);

    // Allow next transition after a brief delay
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
  }, [currentState]);

  /**
   * Initialize state from localStorage and API
   * Shows appropriate screen immediately, then checks API in background
   */
  useEffect(() => {
    if (isInitialized) {
      return;
    }

    // 1. Check consolidated onboarding state (persists across sessions)
    // This provides fast restoration while API call completes
    const onboardingState = getOnboardingState();

    if (onboardingState?.earlyAccessUnlocked) {
      // Show early access immediately (fast path)
      setFlowData({
        email: onboardingState.email,
        waitlistToken: onboardingState.waitlistToken || '',
      });
      setCurrentState('earlyAccess');
      setIsInitialized(true);
      
      // Verify with API in background
      fetch('/api/waitlist/status')
        .then((response) => response.json())
        .then((data: WaitlistStatusResponse) => {
          if (data.data?.has_seen_early_access) {
            // Confirmed - user has seen it, keep localStorage for next visit
            // (Don't clear it - it's our persistence layer)
          } else if (data.data && !data.data.has_seen_early_access) {
            // Database says not seen - sync it (edge case)
            fetch('/api/waitlist/update', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: onboardingState.email,
                waitlistToken: onboardingState.waitlistToken,
                has_seen_early_access: true,
              }),
            });
          } else {
            // No waitlist entry - clear consolidated state
            clearOnboardingState();
          }
        })
        .catch((error) => {
          console.error('[WaitlistFlow] Background status check failed:', error);
          // Keep localStorage on error - better UX
        });
      return;
    }

    // 2. Show initial state immediately based on splash visibility
    // This prevents blocking while API call is in progress
    if (isSplashVisible) {
      setCurrentState('splash');
    } else {
      setCurrentState('waitlist');
    }
    setIsInitialized(true);

    // 3. Check API for waitlist status in background
    // Update state if needed (e.g., user has joined waitlist but hasn't seen early access)
    fetch('/api/waitlist/status')
      .then((response) => response.json())
      .then((data: WaitlistStatusResponse) => {
        if (data.data && !data.data.has_seen_early_access) {
          // User has joined waitlist but hasn't seen early access screen yet
          const email = data.data.email;
          setFlowData((prev) => ({
            email,
            waitlistToken: prev.waitlistToken,
          }));
          
          // Store in consolidated state for persistence across sessions
          setOnboardingState({
            email,
            waitlistSubmitted: true,
            earlyAccessUnlocked: true,
            submittedAt: new Date().toISOString(),
          });
          
          // Transition to early access if still in initial state
          setCurrentState((prevState) => {
            if (prevState === 'splash' || prevState === 'waitlist' || prevState === 'loading') {
              return 'earlyAccess';
            }
            return prevState;
          });
        } else if (data.data && data.data.has_seen_early_access) {
          // User has already seen early access
          // Keep localStorage for fast restoration on next visit
          // (Don't clear it - it's our persistence mechanism)
        } else {
          // No waitlist entry - clear consolidated state
          clearOnboardingState();
        }
      })
      .catch((error) => {
        console.error('[WaitlistFlow] Failed to check waitlist status:', error);
        // Continue with default flow on error - state is already set
      });
  }, [isInitialized, isSplashVisible]);

  /**
   * Handle splash visibility changes after initialization
   * IMPORTANT: Only allow splash visibility to affect state during initial flow.
   * Once user has progressed (about, waitlist after about, success, earlyAccess),
   * ignore isSplashVisible changes to prevent loops.
   */
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Only allow splash visibility to change state if:
    // 1. We're in initial states (splash or waitlist)
    // 2. User hasn't explicitly progressed past initial flow
    // Once user has progressed (about, success, earlyAccess, etc.), ignore isSplashVisible changes
    const isInitialState = currentState === 'splash' || currentState === 'waitlist';
    const shouldIgnore = !isInitialState || hasProgressedRef.current;
    
    if (shouldIgnore) {
      return;
    }

    // If splash becomes visible and we're in waitlist state (user hasn't started flow yet)
    // transition to splash screen
    if (isSplashVisible && currentState === 'waitlist') {
      setCurrentState('splash');
    }
    // If splash is dismissed and we're in splash state, transition to waitlist
    // BUT: Only if we haven't progressed past initial flow
    else if (!isSplashVisible && currentState === 'splash') {
      setCurrentState('waitlist');
    }
  }, [isSplashVisible, isInitialized, currentState]);

  /**
   * Handlers for state transitions
   */
  const handlers = {
    // Splash → About
    handleContinue: useCallback(() => {
      if (currentState === 'splash') {
        hasProgressedRef.current = true; // Mark as progressed
        transitionTo('about');
      }
    }, [currentState, transitionTo]),

    // About → Waitlist
    handleAboutComplete: useCallback(() => {
      if (currentState === 'about') {
        hasProgressedRef.current = true; // Mark as progressed
        transitionTo('waitlist');
      }
    }, [currentState, transitionTo]),

    // Waitlist → Success
    handleWaitlistSuccess: useCallback((email: string, token?: string) => {
      if (currentState === 'waitlist') {
        transitionTo('success', {
          email,
          waitlistToken: token || '',
        });
      }
    }, [currentState, transitionTo]),

    // Success → Early Access
    handleSuccessComplete: useCallback(() => {
      if (currentState === 'success') {
        // State already persisted by WaitlistScreen/ProviderSelectionModal
        // Just transition to early access screen
        transitionTo('earlyAccess');
      }
    }, [currentState, transitionTo]),

    // Early Access → About (Learn More)
    handleLearnMore: useCallback(() => {
      if (currentState === 'earlyAccess') {
        transitionTo('aboutFromEarlyAccess');
      }
    }, [currentState, transitionTo]),

    // About (from Early Access) → Early Access
    handleAboutCompleteFromEarlyAccess: useCallback(() => {
      if (currentState === 'aboutFromEarlyAccess') {
        transitionTo('earlyAccess');
      }
    }, [currentState, transitionTo]),

    // Early Access → Complete (redirect to welcome page for PWA install)
    handleEarlyAccessComplete: useCallback(() => {
      if (currentState === 'earlyAccess') {
        // CRITICAL: Keep localStorage intact so PWA knows user already joined
        // Database already has has_seen_early_access = true
        // State persists for future sessions/PWA installs
        
        // Mark early access as completed for welcome page detection
        localStorage.setItem('early_access_completed', 'true');
        
        // Redirect to root with query parameter for welcome page
        // This ensures proper URL context for iOS PWA installation
        if (typeof window !== 'undefined') {
          window.location.href = '/?from=early-access';
        }
      }
    }, [currentState]),

    // Provider question handler (shows modal, doesn't change state)
    handleProviderQuestion: useCallback((email: string) => {
      setFlowData((prev) => ({ ...prev, email }));
    }, []),

    // Waitlist complete (from provider modal)
    handleWaitlistComplete: useCallback((token?: string) => {
      if (currentState === 'waitlist') {
        transitionTo('success', {
          waitlistToken: token || '',
        });
      }
    }, [currentState, transitionTo]),
  };

  return {
    currentState,
    flowData,
    isInitialized,
    isLoading: currentState === 'loading',
    ...handlers,
  };
}
