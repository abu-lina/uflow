'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface LegalLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Legal Links Modal
 * 
 * Bottom sheet modal displaying legal links (Impressum, Privacy Policy, Terms of Service).
 * Used in Stage 1/2 early access screens where Profile menu is not available.
 * 
 * Features:
 * - Bottom sheet on mobile, centered on desktop
 * - Backdrop with blur
 * - Close button
 * - Keyboard navigation (Escape to close)
 * - Accessibility support
 */
export function LegalLinksModal({ isOpen, onClose }: LegalLinksModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
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
  }, [isOpen, handleClose]);

  // Reset closing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleLinkClick = (href: string) => {
    // Navigate first, then close modal
    router.push(href);
    // Close modal after a brief delay to allow navigation to start
    setTimeout(() => {
      handleClose();
    }, 50);
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
        aria-labelledby="legal-links-modal-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[999999] flex items-end justify-center md:inset-0 md:items-center"
        role="dialog"
      >
        {/* Modal Content */}
        <div
          className="relative flex w-full max-w-[392px] flex-col gap-4 rounded-t-[32px] bg-white p-4 md:rounded-[24px] md:max-w-[480px] md:p-6"
          style={{
            transform: isClosing
              ? 'translateY(100%) scale(0.95)'
              : 'translateY(0) scale(1)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Title and Close Button - Inline */}
          <div className="flex w-full items-center justify-between">
            <h2
              className="font-inter-tight text-2xl font-semibold text-content-heading"
              id="legal-links-modal-title"
            >
              {t('legal.legalLinksTitle') || t('legal.impressum')}
            </h2>
            <Button
              aria-label={t('common.close')}
              className="rounded-full"
              icon="material-symbols:close-rounded"
              size="icon"
              type="button"
              variant="ghost"
              onClick={handleClose}
            />
          </div>

          {/* Links Container */}
          <div className="flex flex-col gap-2">
            {/* Impressum Link */}
            <button
              className={cn(
                'flex w-full items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
                'hover:bg-neutral-muted hover:border-primary',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
              type="button"
              onClick={() => handleLinkClick('/impressum')}
            >
              <span className="font-inter-tight text-base font-semibold text-content-heading">
                {t('legal.impressum')}
              </span>
              <Icon
                aria-hidden="true"
                className="size-5 text-primary"
                icon="material-symbols:arrow-forward-rounded"
              />
            </button>

            {/* Privacy Policy Link */}
            <button
              className={cn(
                'flex w-full items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
                'hover:bg-neutral-muted hover:border-primary',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
              type="button"
              onClick={() => handleLinkClick('/privacy-policy')}
            >
              <span className="font-inter-tight text-base font-semibold text-content-heading">
                {t('legal.privacyPolicy')}
              </span>
              <Icon
                aria-hidden="true"
                className="size-5 text-primary"
                icon="material-symbols:arrow-forward-rounded"
              />
            </button>

            {/* Terms of Service Link */}
            <button
              className={cn(
                'flex w-full items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
                'hover:bg-neutral-muted hover:border-primary',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
              type="button"
              onClick={() => handleLinkClick('/terms')}
            >
              <span className="font-inter-tight text-base font-semibold text-content-heading">
                {t('legal.termsOfService')}
              </span>
              <Icon
                aria-hidden="true"
                className="size-5 text-primary"
                icon="material-symbols:arrow-forward-rounded"
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
