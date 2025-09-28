/**
 * PWA Detection Utilities
 * Detects if the app is running as a PWA or in a regular browser
 */

import { useState, useEffect } from 'react';

export interface PWADetectionResult {
  isPWA: boolean;
  isStandalone: boolean;
  isIOSPWA: boolean;
  isAndroidPWA: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  userAgent: string;
  platform: string;
}

/**
 * Detects if the app is running as a PWA
 */
export function detectPWA(): PWADetectionResult {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return {
      isPWA: false,
      isStandalone: false,
      isIOSPWA: false,
      isAndroidPWA: false,
      displayMode: 'browser',
      userAgent: '',
      platform: '',
    };
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  // Check if running in standalone mode (PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  // Check for iOS PWA
  const isIOSPWA = /iPad|iPhone|iPod/.test(userAgent) && 
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  // Check for Android PWA
  const isAndroidPWA = /Android/.test(userAgent) && 
    window.matchMedia('(display-mode: standalone)').matches;

  // Determine display mode
  let displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' = 'browser';
  
  if (window.matchMedia('(display-mode: standalone)').matches) {
    displayMode = 'standalone';
  } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    displayMode = 'minimal-ui';
  } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
    displayMode = 'fullscreen';
  }

  // PWA is true if any of the standalone conditions are met
  const isPWA = isStandalone || isIOSPWA || isAndroidPWA;

  return {
    isPWA,
    isStandalone,
    isIOSPWA,
    isAndroidPWA,
    displayMode,
    userAgent,
    platform,
  };
}

/**
 * Hook for React components to detect PWA status
 */
export function usePWADetection(): PWADetectionResult {
  const [pwaInfo, setPwaInfo] = useState<PWADetectionResult>(() => detectPWA());

  useEffect(() => {
    // Re-detect on mount to ensure accuracy
    setPwaInfo(detectPWA());
  }, []);

  return pwaInfo;
}

/**
 * Check if the app can be installed as a PWA
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if beforeinstallprompt event is supported
  return 'onbeforeinstallprompt' in window;
}

/**
 * Get PWA installation status
 */
export function getPWAInstallStatus(): 'not-installable' | 'installable' | 'installed' {
  if (typeof window === 'undefined') return 'not-installable';

  const pwaInfo = detectPWA();
  
  if (pwaInfo.isPWA) {
    return 'installed';
  }
  
  if (canInstallPWA()) {
    return 'installable';
  }
  
  return 'not-installable';
}

/**
 * Debug function to log PWA detection info
 */
export function debugPWAInfo(): void {
  if (typeof window === 'undefined') return;

  const info = detectPWA();
  
  console.group('🔍 PWA Detection Debug');
  console.log('Is PWA:', info.isPWA);
  console.log('Is Standalone:', info.isStandalone);
  console.log('Is iOS PWA:', info.isIOSPWA);
  console.log('Is Android PWA:', info.isAndroidPWA);
  console.log('Display Mode:', info.displayMode);
  console.log('User Agent:', info.userAgent);
  console.log('Platform:', info.platform);
  console.log('Can Install:', canInstallPWA());
  console.log('Install Status:', getPWAInstallStatus());
  console.groupEnd();
}
