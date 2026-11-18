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
    <div className="fixed right-4 top-20 z-50 max-w-xs rounded bg-blue-500 p-3 text-white shadow-lg">
      <div className="space-y-1 font-mono text-xs">
        <div className="font-bold">PWA Detection</div>
        <div>PWA: {pwaInfo.isPWA ? '✅' : '❌'}</div>
        <div>Standalone: {pwaInfo.isStandalone ? '✅' : '❌'}</div>
        <div>iOS PWA: {pwaInfo.isIOSPWA ? '✅' : '❌'}</div>
        <div>Android PWA: {pwaInfo.isAndroidPWA ? '✅' : '❌'}</div>
        <div>Mode: {pwaInfo.displayMode}</div>
        <div>Installable: {canInstallPWA() ? '✅' : '❌'}</div>
        <div>Status: {installStatus}</div>
        <button className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs" onClick={handleDebug}>
          Log to Console
        </button>
      </div>
    </div>
  );
}
