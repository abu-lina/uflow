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
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <span>{isIOSPWA ? 'PWA (iOS)' : isAndroidPWA ? 'PWA (Android)' : 'PWA Mode'}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-content-muted ${className}`}>
      <div className="h-2 w-2 rounded-full bg-neutral-400"></div>
      <span>Browser Mode</span>
    </div>
  );
}
