'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLanguage } from '@/providers/LanguageProvider';
import { detectPWA } from '@/utils/pwaUtils';
import { IOSInstallInstructionsModal } from '@/components/shared/IOSInstallInstructionsModal';
import { Button } from '@/components/ui/Button';

interface PWAInstallButtonProps {
  className?: string;
}

const DISMISSAL_KEY = 'pwaInstallDismissed';

export function PWAInstallButton({ className }: PWAInstallButtonProps) {
  const { t } = useLanguage();
  const { isInstallable, isIOS, install } = usePWAInstall();
  const pwaInfo = detectPWA();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Check dismissal state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(DISMISSAL_KEY) === 'true';
      setIsDismissed(dismissed);
    }
  }, []);

  // Don't show if already installed
  if (pwaInfo.isPWA || pwaInfo.isStandalone) {
    return null;
  }

  // Don't show if dismissed
  if (isDismissed) {
    return null;
  }

  // Show in development mode for testing, or if installable (Android) or iOS
  if (!isDevelopment && !isInstallable && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    if (isIOS) {
      // Show iOS instructions modal
      setShowIOSInstructions(true);
      return;
    }

    if (isInstallable) {
      await install();
    }
  };

  const handleIOSModalClose = () => {
    setShowIOSInstructions(false);
  };

  return (
    <>
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <Button
          aria-label={
            isIOS
              ? t('waitlist.earlyAccess.pwaInstall.iosButton')
              : t('waitlist.earlyAccess.pwaInstall.button')
          }
          className={className}
          size="text"
          type="button"
          variant="tertiary"
          onClick={handleClick}
        >
          {isIOS
            ? t('waitlist.earlyAccess.pwaInstall.iosButton')
            : t('waitlist.earlyAccess.pwaInstall.button')}
        </Button>
      </motion.div>

      {/* iOS Instructions Modal */}
      <IOSInstallInstructionsModal
        isOpen={showIOSInstructions}
        onClose={handleIOSModalClose}
      />
    </>
  );
}

