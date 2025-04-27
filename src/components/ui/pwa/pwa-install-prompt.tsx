'use client';

import { useState, useEffect, useCallback } from 'react';

import { toast } from 'react-hot-toast';

/**
 * BeforeInstallPromptEvent interface for PWA installation
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 *
 * Shows a user-friendly prompt to install the PWA when it's available
 * and handles the PWA installation process.
 */
export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Handle the install prompt event
  useEffect(() => {
    // Check if running in the browser
    if (typeof window === 'undefined') return;

    // Check if already installed as PWA
    const checkIfInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
      }
    };

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();

      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);

      // Show our install button
      setIsVisible(true);
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      // Hide the install button
      setIsInstalled(true);
      setIsVisible(false);

      // Show success message
      toast.success('Thank you for installing Ummah Flow!', {
        duration: 3000,
        icon: '✅',
      });

      console.log('PWA was installed');
    };

    // Run initial check
    checkIfInstalled();

    // Set up event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle the install button click
  const handleInstallClick = useCallback(async () => {
    if (!installPrompt) return;

    try {
      // Show the install prompt
      await installPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await installPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Toast already shown by appinstalled event
      } else {
        console.log('User dismissed the install prompt');
        toast('You can install the app later from the menu', {
          duration: 3000,
          icon: 'ℹ️',
        });
      }
    } catch (err) {
      console.error('Error during installation:', err);
      toast.error('Installation failed. Please try again later.');
    } finally {
      // Clear the saved prompt as it can't be used again
      setInstallPrompt(null);
      setIsVisible(false);
    }
  }, [installPrompt]);

  // Don't render anything if conditions aren't met
  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <div
      aria-describedby="install-description"
      aria-labelledby="install-title"
      className="fixed bottom-4 left-0 right-0 z-50 mx-auto w-max"
      role="alertdialog"
    >
      <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex-shrink-0 text-emerald-600">
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex-grow">
          <p className="font-medium text-gray-800" id="install-title">
            Install Ummah Flow
          </p>
          <p className="text-sm text-gray-600" id="install-description">
            Add to your home screen for quick access
          </p>
        </div>

        <div className="flex gap-2">
          <button
            aria-label="Dismiss"
            className="p-2 text-gray-500 hover:text-gray-700"
            onClick={() => setIsVisible(false)}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                clipRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                fillRule="evenodd"
              />
            </svg>
          </button>

          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onClick={handleInstallClick}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
