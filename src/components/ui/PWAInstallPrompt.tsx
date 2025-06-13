'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';

import { X } from 'lucide-react';

import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { isInstallable, isIOS, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if not dismissed in the last 3 days
    const lastDismissed = localStorage.getItem('pwaPromptDismissed');
    if (lastDismissed && Date.now() - Number(lastDismissed) < 3 * 24 * 60 * 60 * 1000) {
      return;
    }
    const timer = setTimeout(() => {
      if (isInstallable || isIOS) setIsVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isInstallable, isIOS]);

  if (!isVisible) return null;

  // Overlay for background dimming
  // The overlay should be behind the prompt but above the rest of the app

  // Handler to trigger install unless clicking the close button
  const handlePromptClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the click is on the close button or its children, do nothing
    if ((e.target as HTMLElement).closest('.pwa-close-btn')) return;
    if (!isIOS && isInstallable) {
      install();
    }
  };

  const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
      />
      <div
        aria-label={isIOS ? 'Installationsanleitung öffnen' : 'App installieren'}
        aria-modal="true"
        className="animate-fadeIn fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md cursor-pointer rounded-2xl bg-white p-4 shadow-lg transition-transform hover:scale-105 active:scale-95 sm:left-8 sm:right-8"
        role="dialog"
        tabIndex={0}
        onClick={handlePromptClick}
      >
        {/* Header Row: Logo, Title, Close */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[7.2px] bg-[#589D96]">
              <Image
                priority
                alt="U-Flow App Icon"
                className="rounded-[7.2px]"
                height={32}
                src="/icons/icon-32x32.png"
                width={32}
              />
            </div>
            <span className="font-inter-tight text-lg font-semibold text-[#333]">
              Installiere U-Flow
            </span>
          </div>
          <button
            aria-label="Schließen"
            className="pwa-close-btn flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            tabIndex={0}
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="my-3 w-full border-t border-[#BBBBBB]" />

        {/* Description */}
        <div className="text-[16px] leading-snug text-[#555]">
          Installiere die App auf deinem Gerät,
          <br />
          um jederzeit schnell darauf zuzugreifen.
        </div>

        {/* Benefit */}
        <div className="mb-2 mt-2 px-1 font-inter-tight text-[16px] font-bold text-[#111]">
          🚀 Kein App Store. Kein Download. Einfach öffnen.
        </div>

        {/* Steps */}
        <ol className="mt-3 flex flex-col gap-2 text-[16px] text-[#333]">
          <li className="flex items-center gap-2">
            <span>1. Tippe unten auf das Teilen-Symbol</span>
            <span className="flex h-[22px] w-[22px] items-center justify-center">
              {/* Share icon SVG */}
              <svg
                aria-label="Teilen Symbol"
                fill="none"
                height="22"
                viewBox="0 0 22 22"
                width="22"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  height="20.1513"
                  rx="3.87524"
                  stroke="#999999"
                  strokeWidth="0.516699"
                  width="20.1513"
                  x="0.924365"
                  y="0.924365"
                />
                <path
                  d="M13.3848 9.09238H14.5771C14.8934 9.09238 15.1967 9.21801 15.4203 9.44162C15.6439 9.66524 15.7695 9.96853 15.7695 10.2848V16.0082C15.7695 16.3244 15.6439 16.6277 15.4203 16.8513C15.1967 17.075 14.8934 17.2006 14.5771 17.2006H7.42285C7.10661 17.2006 6.80332 17.075 6.57971 16.8513C6.35609 16.6277 6.23047 16.3244 6.23047 16.0082V10.2848C6.23047 9.96853 6.35609 9.66524 6.57971 9.44162C6.80332 9.21801 7.10661 9.09238 7.42285 9.09238H8.61523M13.3848 7.18457L11 4.7998M11 4.7998L8.61523 7.18457M11 4.7998V12.9378"
                  stroke="#007AFF"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.953906"
                />
              </svg>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span>2. Wähle</span>
            <span className="flex items-center gap-1 rounded border border-[#999] bg-white px-2 py-1 text-[15px] font-medium">
              Zum Homebildschirm
              <svg aria-label="Plus Symbol" fill="none" height="17" viewBox="0 0 24 24" width="17">
                <rect height="20" rx="6" stroke="#333" strokeWidth="2" width="20" x="2" y="2" />
                <path d="M12 7v10M7 12h10" stroke="#333" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
          </li>
        </ol>
      </div>
    </>
  );
}
