'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { detectPWA } from '@/utils/pwaUtils';
import { getFeatureFlag } from '@/config/feature-flags';

/**
 * PWA Start Page - Entry point for PWA installations
 * 
 * This page is set as the manifest's start_url and handles:
 * 1. Standalone mode detection (is app running as PWA?)
 * 2. Routing based on app launch status and PWA state
 * 3. Ensuring correct URL context for iOS PWA
 * 
 * Flow:
 * - If in PWA (standalone): Route to /waitlist or /providers based on isAppLaunched
 * - If in browser: Redirect to / (root) for normal routing
 */
export default function PWAStart() {
  const router = useRouter();

  useEffect(() => {
    const pwaInfo = detectPWA();
    const isAppLaunched = getFeatureFlag('isAppLaunched');
    
    // Detect if running in standalone mode (PWA)
    if (pwaInfo.isPWA || pwaInfo.isStandalone) {
      // In PWA mode - route based on app status
      if (isAppLaunched) {
        // App is launched - show main app (providers)
        router.replace('/providers');
      } else {
        // App not launched - show waitlist in standalone mode
        router.replace('/waitlist');
      }
    } else {
      // Not in PWA mode (browser) - redirect to root
      // Root will handle routing to waitlist or welcome page
      router.replace('/');
    }
  }, [router]);

  // Loading state while detecting and routing
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <p className="text-gray-600">Launching...</p>
      </div>
    </div>
  );
}




