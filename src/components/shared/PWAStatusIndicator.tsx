'use client';

import { usePWADetection } from '@/utils/pwaUtils';

interface PWAStatusIndicatorProps {
  className?: string;
}

/**
 * Component that shows PWA status to users
 * Can be used to encourage PWA installation or show current status
 */
export function PWAStatusIndicator({ className }: PWAStatusIndicatorProps) {
  const { isPWA, isIOSPWA, isAndroidPWA } = usePWADetection();

  if (isPWA) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>
          {isIOSPWA ? 'PWA (iOS)' : isAndroidPWA ? 'PWA (Android)' : 'PWA Mode'}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
      <span>Browser Mode</span>
    </div>
  );
}
