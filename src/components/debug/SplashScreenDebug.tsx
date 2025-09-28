'use client';

import { resetSplashScreen } from '@/utils/splashUtils';
import { useSplash } from '@/providers/splash-provider';

/**
 * Debug component for testing splash screen
 * Only shows in development mode
 */
export function SplashScreenDebug() {
  const { setSplashVisible } = useSplash();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleResetSplash = () => {
    resetSplashScreen();
    // Force a small delay to ensure localStorage is updated
    setTimeout(() => {
      setSplashVisible(true);
    }, 100);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white p-2 rounded shadow-lg">
      <button
        onClick={handleResetSplash}
        className="text-xs font-mono"
      >
        Reset Splash Screen
      </button>
    </div>
  );
}
