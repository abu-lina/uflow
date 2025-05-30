'use client';

import { useEffect, useState } from 'react';

import { Download, X } from 'lucide-react';

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

  // Handler to trigger install unless clicking the close button
  const handlePromptClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // If the click is on the close button or its children, do nothing
    if ((e.target as HTMLElement).closest('.pwa-close-btn')) return;
    if (!isIOS && isInstallable) {
      install();
    }
  };

  return (
    <div
      aria-label={isIOS ? 'Installationsanleitung öffnen' : 'App installieren'}
      className="fixed bottom-20 left-4 right-4 z-50 cursor-pointer rounded-2xl bg-white p-4 shadow-lg sm:left-8 sm:right-8"
      role="button"
      tabIndex={0}
      onClick={handlePromptClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-inter-tight text-lg font-semibold text-gray-900">
            {isIOS ? 'Installiere uFlow auf deinem iPhone' : 'Installiere uFlow auf deinem Gerät'}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {isIOS ? (
              <>
                Tippe auf das{' '}
                <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
                  <svg
                    className="mr-1 h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Teilen
                </span>{' '}
                Symbol und wähle &quot;Zum Home-Bildschirm&quot;
              </>
            ) : (
              'Für eine bessere Erfahrung, installiere die App auf deinem Gerät'
            )}
          </p>
        </div>
        <button
          className="pwa-close-btn ml-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          tabIndex={-1}
          onClick={() => setIsVisible(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {!isIOS && (
        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-mint px-4 py-2.5 text-sm font-medium text-white hover:bg-mint/90">
          <Download className="h-4 w-4" />
          Jetzt installieren
        </div>
      )}
    </div>
  );
}
