'use client';

import { detectPWA, canInstallPWA, getPWAInstallStatus, debugPWAInfo } from '@/utils/pwaUtils';

/**
 * Debug component for PWA detection
 * Only shows in development mode
 */
export function PWADetectionDebug() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const pwaInfo = detectPWA();
  const installStatus = getPWAInstallStatus();

  const handleDebug = () => {
    debugPWAInfo();
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-blue-500 text-white p-3 rounded shadow-lg max-w-xs">
      <div className="text-xs font-mono space-y-1">
        <div className="font-bold">PWA Detection</div>
        <div>PWA: {pwaInfo.isPWA ? '✅' : '❌'}</div>
        <div>Standalone: {pwaInfo.isStandalone ? '✅' : '❌'}</div>
        <div>iOS PWA: {pwaInfo.isIOSPWA ? '✅' : '❌'}</div>
        <div>Android PWA: {pwaInfo.isAndroidPWA ? '✅' : '❌'}</div>
        <div>Mode: {pwaInfo.displayMode}</div>
        <div>Installable: {canInstallPWA() ? '✅' : '❌'}</div>
        <div>Status: {installStatus}</div>
        <button
          className="mt-2 px-2 py-1 bg-blue-600 rounded text-xs"
          onClick={handleDebug}
        >
          Log to Console
        </button>
      </div>
    </div>
  );
}
