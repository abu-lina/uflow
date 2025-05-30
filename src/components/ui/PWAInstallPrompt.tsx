'use client';

import { useEffect, useState } from 'react';

import { X } from 'lucide-react';

import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show the prompt after a short delay
    const timer = setTimeout(() => {
      if (isInstallable || isIOS) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isIOS]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-white p-4 shadow-lg sm:left-8 sm:right-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-inter-tight text-lg font-semibold text-gray-900">
            {isIOS ? 'Installiere uFlow auf deinem iPhone' : 'Installiere uFlow auf deinem Gerät'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {isIOS
              ? 'Tippe auf das Teilen-Symbol und wähle "Zum Home-Bildschirm"'
              : 'Für eine bessere Erfahrung, installiere die App auf deinem Gerät'}
          </p>
        </div>
        <button
          className="ml-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {!isIOS && (
        <button
          className="mt-4 w-full rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint/90"
          onClick={install}
        >
          Installieren
        </button>
      )}
    </div>
  );
}
