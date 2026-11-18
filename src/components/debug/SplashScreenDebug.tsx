'use client';

import { getFeatureFlag } from '@/config/feature-flags';
import { resetSplashScreen } from '@/utils/splashUtils';
import { useSplash } from '@/providers/splash-provider';

/**
 * Debug component for testing splash screen
 * Only shows when feature flag is enabled and in development mode
 */
export function SplashScreenDebug() {
  const { setSplashVisible } = useSplash();

  // Check feature flag and development mode
  const isDebugEnabled = getFeatureFlag('splashScreenDebug');
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDebugEnabled || !isDevelopment) {
    return null;
  }

  const handleResetSplash = () => {
    // Clear splash screen state
    resetSplashScreen();

    // Force a small delay to ensure localStorage is updated
    setTimeout(() => {
      setSplashVisible(true);
    }, 100);
  };

  return (
    <div className="fixed right-4 top-4 z-50 rounded bg-red-500 p-2 text-white shadow-lg">
      <button className="font-mono text-xs" onClick={handleResetSplash}>
        Reset Splash Screen
      </button>
    </div>
  );
}
