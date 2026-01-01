'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { waitForServiceWorkerActivation } from '@/utils/serviceWorkerUtils';
import { useLanguage } from '@/providers/LanguageProvider';

/**
 * Welcome Page - PWA Installation Landing
 * 
 * Shown to users after completing early access onboarding.
 * Purpose: Provide ideal context for PWA installation at root URL (/)
 * 
 * Features:
 * - Waits for service worker activation before showing install prompt
 * - Shows loading state while SW activates
 * - Provides "Continue in Browser" fallback
 * - Integrates with PWAInstallPrompt component
 */
export default function WelcomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for service worker to be active before showing install prompt
    waitForServiceWorkerActivation(10000).then(active => {
      setIsLoading(false);
      
      if (active) {
        console.log('[Welcome] Service worker ready for PWA installation');
      } else {
        console.warn('[Welcome] Service worker activation timeout - showing prompt anyway');
      }
    });
  }, []);

  const handleContinueInBrowser = () => {
    // User chose to continue in browser instead of installing PWA
    router.push('/waitlist');
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-6 bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[14.4px] bg-primary shadow-lg">
            <Image
              alt="U-Flow App Icon"
              className="rounded-[14.4px]"
              height={80}
              priority={true}
              quality={95}
              src="/icons/icon-512x512.png"
              width={80}
            />
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-3xl font-bold mb-4 text-[#333]">
          {t('welcome.title')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('welcome.subtitle')}
        </p>
        
        {/* Service Worker Loading State */}
        {isLoading ? (
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <p className="text-gray-500">{t('welcome.preparing')}</p>
          </div>
        ) : (
          /* PWA Install Prompt */
          <div className="mb-8">
            <PWAInstallPrompt 
              context="welcome"
              showImmediately={true}
              onInstalled={() => {
                // Track successful installation
                console.log('[Welcome] PWA installed successfully');
                // Could add analytics tracking here
              }}
            />
          </div>
        )}
        
        {/* Continue in Browser Option */}
        {!isLoading && (
          <Button
            className="text-gray-500 hover:text-gray-700"
            variant="ghost"
            onClick={handleContinueInBrowser}
          >
            {t('welcome.continueInBrowser')}
          </Button>
        )}
      </div>
    </div>
  );
}

