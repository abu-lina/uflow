'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';

interface IOSInstallInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IOSInstallInstructionsModal({
  isOpen,
  onClose,
}: IOSInstallInstructionsModalProps) {
  const { t } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsClosing(true);
        setTimeout(() => {
          setIsClosing(false);
          onClose();
        }, 200);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        aria-describedby="ios-install-modal-description"
        aria-labelledby="ios-install-modal-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[999999] flex items-end justify-center md:inset-0 md:items-center"
        role="dialog"
      >
        {/* Modal Content */}
        <div
          className="relative flex w-full max-w-[392px] flex-col items-center gap-4 rounded-t-[32px] bg-background p-4 md:rounded-[24px] md:max-w-[480px] md:p-6"
          style={{
            transform: isClosing
              ? 'translateY(100%) scale(0.95)'
              : 'translateY(0) scale(1)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Close Button */}
          <div className="flex w-full justify-end">
            <Button
              aria-label={t('waitlist.earlyAccess.pwaInstall.iosModal.close')}
              className="rounded-full"
              icon="material-symbols:close-rounded"
              size="icon"
              type="button"
              variant="ghost"
              onClick={handleClose}
            />
          </div>

          {/* Content */}
          <div className="flex w-full flex-col items-center gap-6 px-2 pb-2">
            {/* Title */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h2
                className="font-inter-tight text-xl font-semibold leading-tight text-content-heading md:text-2xl"
                id="ios-install-modal-title"
              >
                {t('waitlist.earlyAccess.pwaInstall.iosModal.title')}
              </h2>
              <p
                className="font-inter text-sm text-content md:text-base"
                id="ios-install-modal-description"
              >
                {t('waitlist.earlyAccess.pwaInstall.iosModal.description')}
              </p>
            </div>

            {/* Steps */}
            <div className="flex w-full flex-col gap-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="font-inter-tight text-sm font-semibold">1</span>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 text-primary"
                      icon="material-symbols:share-rounded"
                    />
                    <p className="font-inter-tight text-base font-semibold text-content-heading">
                      {t('waitlist.earlyAccess.pwaInstall.iosModal.step1')}
                    </p>
                  </div>
                  <p className="font-inter text-sm text-content-muted">
                    {t('waitlist.earlyAccess.pwaInstall.iosModal.step1Description')}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="font-inter-tight text-sm font-semibold">2</span>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 text-primary"
                      icon="material-symbols:add-rounded"
                    />
                    <p className="font-inter-tight text-base font-semibold text-content-heading">
                      {t('waitlist.earlyAccess.pwaInstall.iosModal.step2')}
                    </p>
                  </div>
                  <p className="font-inter text-sm text-content-muted">
                    {t('waitlist.earlyAccess.pwaInstall.iosModal.step2Description')}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="font-inter-tight text-sm font-semibold">3</span>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 text-primary"
                      icon="material-symbols:check-circle-rounded"
                    />
                    <p className="font-inter-tight text-base font-semibold text-content-heading">
                      {t('waitlist.earlyAccess.pwaInstall.iosModal.step3')}
                    </p>
                  </div>
                  <p className="font-inter text-sm text-content-muted">
                    {t('waitlist.earlyAccess.pwaInstall.iosModal.step3Description')}
                  </p>
                </div>
              </div>
            </div>

            {/* Got it Button */}
            <Button
              fullWidth
              aria-label={t('waitlist.earlyAccess.pwaInstall.iosModal.gotIt')}
              size="lg"
              variant="primary"
              onClick={handleClose}
            >
              {t('waitlist.earlyAccess.pwaInstall.iosModal.gotIt')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

