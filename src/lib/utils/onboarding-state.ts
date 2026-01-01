/**
 * Consolidated onboarding state management for localStorage
 * 
 * This module manages the persistent onboarding state that survives:
 * - Browser refresh
 * - PWA install
 * - App reopen
 * 
 * Key: ummahflow_onboarding
 */

export interface OnboardingState {
  email: string;
  waitlistSubmitted: boolean;
  earlyAccessUnlocked: boolean;
  submittedAt: string; // ISO timestamp
  waitlistToken?: string;
}

const STORAGE_KEY = 'ummahflow_onboarding';

/**
 * Check if we're in a browser environment (SSR-safe)
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get the current onboarding state from localStorage
 * Includes migration logic for existing users with old keys
 */
export function getOnboardingState(): OnboardingState | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    // First check for new consolidated state
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as OnboardingState;
      return parsed;
    }

    // Migration: Check if old keys exist (for existing users)
    const oldShowEarlyAccess = localStorage.getItem('showEarlyAccess');
    const oldEmail = localStorage.getItem('waitlistEmail');
    const oldToken = localStorage.getItem('waitlistToken');

    if (oldShowEarlyAccess === 'true' && oldEmail) {
      // Migrate to new format
      const migratedState: OnboardingState = {
        email: oldEmail,
        waitlistSubmitted: true,
        earlyAccessUnlocked: true,
        submittedAt: new Date().toISOString(),
        waitlistToken: oldToken || undefined,
      };

      // Save in new format
      setOnboardingState(migratedState);

      // Clean up old keys
      localStorage.removeItem('showEarlyAccess');
      localStorage.removeItem('waitlistEmail');
      localStorage.removeItem('waitlistToken');

      return migratedState;
    }

    return null;
  } catch (error) {
    console.error('[OnboardingState] Failed to get state:', error);
    return null;
  }
}

/**
 * Set the onboarding state in localStorage
 */
export function setOnboardingState(state: OnboardingState): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Verify write succeeded
    const verification = localStorage.getItem(STORAGE_KEY);
    if (!verification) {
      console.error('[OnboardingState] Failed to write - localStorage blocked or full');
      alert('Please enable localStorage to continue. Check browser settings.');
      return;
    }
  } catch (error) {
    console.error('[OnboardingState] Failed to set state:', error);
    // Alert user if localStorage is blocked
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      alert('Browser storage is full. Please clear some data.');
    }
  }
}

/**
 * Clear the onboarding state from localStorage
 * Only use this for explicit resets (e.g., user clears data)
 */
export function clearOnboardingState(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    
    // Also clean up any old keys that might still exist
    localStorage.removeItem('showEarlyAccess');
    localStorage.removeItem('waitlistEmail');
    localStorage.removeItem('waitlistToken');
  } catch (error) {
    console.error('[OnboardingState] Failed to clear state:', error);
  }
}

/**
 * Check if user has joined the waitlist
 */
export function hasJoinedWaitlist(): boolean {
  const state = getOnboardingState();
  return state?.waitlistSubmitted ?? false;
}

/**
 * Update specific fields in the onboarding state
 */
export function updateOnboardingState(
  updates: Partial<OnboardingState>
): void {
  const current = getOnboardingState();
  if (!current) {
    console.warn('[OnboardingState] Cannot update - no existing state');
    return;
  }

  setOnboardingState({
    ...current,
    ...updates,
  });
}

