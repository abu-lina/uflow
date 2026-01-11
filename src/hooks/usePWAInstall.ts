import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(installed);
      return installed;
    };

    const installed = checkInstalled();
    if (installed) {
      console.log('[PWA] Already installed in standalone mode');
      return;
    }

    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);
    console.log('[PWA] Device detection', { 
      isIOSDevice, 
      userAgent: navigator.userAgent,
      isInstalled: installed,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
    });

    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
      console.log('[PWA] beforeinstallprompt event fired - app is installable');
    };

    // Handle appinstalled event (fires after successful installation)
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install called but no deferred prompt available');
      return;
    }

    console.log('[PWA] Showing install prompt...');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    if (outcome === 'accepted') {
      setIsInstallable(false);
      console.log('[PWA] User accepted installation');
    } else {
      console.log('[PWA] User dismissed installation');
    }

    setDeferredPrompt(null);
  };

  // Alias for backwards compatibility and new API
  const triggerInstall = install;
  const canInstallNatively = isInstallable;

  return {
    // New API (aligned with spec)
    canInstallNatively,
    isIOS,
    isInstalled,
    triggerInstall,
    // Backwards compatibility aliases
    isInstallable,
    install,
  };
}
