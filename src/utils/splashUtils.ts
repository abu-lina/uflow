/**
 * Utility functions for managing the mobile splash screen
 */

/**
 * Clear the splash screen flag to show splash screen again
 * Useful for testing or if user wants to see splash screen again
 */
export function resetSplashScreen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('hasSeenSplashScreen');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SPLASH] Failed to reset splash screen:', error);
    }
  }
}

/**
 * Check if user has seen the splash screen
 */
export function hasSeenSplashScreen(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem('hasSeenSplashScreen') === 'true';
  } catch (error) {
    // Fallback: assume user hasn't seen splash if localStorage fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SPLASH] localStorage access failed:', error);
    }
    return false;
  }
}

/**
 * Mark splash screen as seen
 */
export function markSplashScreenAsSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('hasSeenSplashScreen', 'true');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SPLASH] Failed to mark splash as seen:', error);
    }
  }
}
