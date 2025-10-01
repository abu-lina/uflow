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
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white p-2 rounded shadow-lg">
      <button
        className="text-xs font-mono"
        onClick={handleResetSplash}
      >
        Reset Splash Screen
      </button>
    </div>
  );
}
