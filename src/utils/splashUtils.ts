/**
 * Utility functions for managing the mobile splash screen
 */

/**
 * Clear the splash screen flag to show splash screen again
 * Useful for testing or if user wants to see splash screen again
 */
export function resetSplashScreen(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('hasSeenSplashScreen');
  }
}

/**
 * Check if user has seen the splash screen
 */
export function hasSeenSplashScreen(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('hasSeenSplashScreen') === 'true';
  }
  return false;
}

/**
 * Mark splash screen as seen
 */
export function markSplashScreenAsSeen(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hasSeenSplashScreen', 'true');
  }
}
