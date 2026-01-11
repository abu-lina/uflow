'use client';

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { IOSInstallInstructionsModal } from '@/components/shared/IOSInstallInstructionsModal';
import { cn } from '@/lib/utils';

interface PWAInstallCTAProps {
  className?: string;
}

const PWA_DISMISSAL_KEY = 'pwa_install_dismissed';

/**
 * PWA Install CTA Card Component
 * 
 * Displays a card with title, description, and CTAs for installing the PWA.
 * - Triggers native install prompt on supported browsers (Chrome/Edge)
 * - Opens iOS install instructions modal on iOS Safari
 * - Only renders if app is not already installed and installation is possible
 * 
 * Design tokens (from Figma):
 * - Card: white bg, border-border, rounded-[24px], p-4, gap-6
 * - Title: Inter, 500, 20px/24px, content-heading, centered
 * - Description: Inter, 400, 16px/19px, content-muted, centered
 * - Primary CTA: h-12, rounded-sm (12px), primary bg
 * - Secondary CTA: h-12, rounded-sm (12px), neutral-light bg
 */
export function PWAInstallCTA({ className }: PWAInstallCTAProps) {
  const { canInstallNatively, isIOS, isInstalled, triggerInstall } = usePWAInstall();
  const { t } = useLanguage();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if previously dismissed on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(PWA_DISMISSAL_KEY) === 'true';
      setIsDismissed(dismissed);
    }
  }, []);

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  // Don't render if already installed
  if (isInstalled) {
    return null;
  }

  // Don't render if installation is not possible
  if (!canInstallNatively && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      // Open iOS instructions modal
      setShowIOSModal(true);
    } else if (canInstallNatively) {
      // Trigger native install prompt
      await triggerInstall();
    }
  };

  const handleLaterClick = () => {
    // Save dismissal to localStorage and hide the card
    if (typeof window !== 'undefined') {
      localStorage.setItem(PWA_DISMISSAL_KEY, 'true');
    }
    setIsDismissed(true);
  };

  const handleIOSModalClose = () => {
    setShowIOSModal(false);
  };

  return (
    <>
      {/* PWA Install Card - Always visible, below the fold */}
      <div
        className={cn(
          'flex w-full flex-col items-center gap-4 rounded-[24px] border border-border-light bg-neutral-muted p-4',
          className
        )}
      >
        {/* Title + Subtitle */}
        <div className="flex w-full flex-col items-center gap-1 text-center">
          <h3 className="font-inter text-lg font-medium leading-[26px] text-content-heading">
            {t('waitlist.earlyAccess.pwaInstall.iosModal.titleAlt')}
          </h3>
          <p className="font-inter text-sm leading-[20px] text-content-muted">
            {t('waitlist.earlyAccess.pwaInstall.description')}
          </p>
        </div>

        {/* Benefits */}
        <div className="flex w-full flex-col gap-1 text-center">
          <p className="font-inter text-sm leading-[20px] text-content-muted">
            {t('waitlist.earlyAccess.pwaInstall.iosModal.benefit')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex w-full flex-col gap-3">
          {/* Primary CTA: "Zum Startbildschirm hinzufügen" */}
          <div className="flex w-full flex-col gap-1">
            <Button
              fullWidth
              aria-label={t('waitlist.earlyAccess.pwaInstall.successScreenCTA')}
              className="h-12 rounded-sm font-inter-tight text-base font-medium"
              variant="primary"
              onClick={handleInstallClick}
            >
              {t('waitlist.earlyAccess.pwaInstall.successScreenCTA')}
            </Button>
            {/* Trust hint: "Kein App Store. Kein Download." */}
            <p className="text-center font-inter text-xs leading-4 text-content-muted">
              {t('waitlist.earlyAccess.pwaInstall.ctaHint')}
            </p>
          </div>

          {/* Secondary CTA: "Später" */}
          <Button
            fullWidth
            aria-label={t('waitlist.earlyAccess.pwaInstall.dismiss')}
            className={cn(
              'h-12 rounded-sm font-inter-tight text-base font-medium',
              'bg-neutral-light text-content-muted',
              'shadow-[0px_8px_24px_rgba(238,238,238,0.25)]',
              'hover:bg-neutral hover:text-content'
            )}
            variant="secondary"
            onClick={handleLaterClick}
          >
            {t('waitlist.earlyAccess.pwaInstall.dismiss')}
          </Button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      <IOSInstallInstructionsModal
        isOpen={showIOSModal}
        onClose={handleIOSModalClose}
      />
    </>
  );
}
