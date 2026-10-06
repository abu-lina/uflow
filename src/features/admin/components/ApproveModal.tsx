'use client';

import { useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useLanguage } from '@/providers/LanguageProvider';

interface ApproveModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Provider name interpolated into the consequence copy */
  providerName: string;
  /** Whether a request is in progress */
  isLoading?: boolean;
  /** Called when the modal should close (cancel, outside click, or Escape) */
  onClose: () => void;
  /** Called when the admin confirms the approval */
  onConfirm: () => void;
}

/**
 * Confirmation modal for approving a provider (#548 design fixes).
 *
 * Approving publishes the restaurant publicly and immediately and triggers
 * enrichment — an irreversible commit that previously fired on one tap while
 * the *reversible* reject had the modal. The guard now sits on the action
 * that needs it. Structure and dismiss semantics mirror RejectModal so the
 * pair reads as one system; the copy is localized (RejectModal's hardcoded
 * English predates the six-catalogue requirement).
 */
export function ApproveModal({
  isOpen,
  providerName,
  isLoading = false,
  onClose,
  onConfirm,
}: ApproveModalProps) {
  const { t } = useLanguage();
  const titleId = useId();

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          role="presentation"
          onClick={handleBackdropClick}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            aria-labelledby={titleId}
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            exit={{ opacity: 0, scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.95 }}
            role="dialog"
          >
            <h2 className="mb-2 text-lg font-semibold text-content-heading" id={titleId}>
              {t('adminHalalEdit.review.approveConfirm.title')}
            </h2>

            <p className="mb-4 text-sm text-content">
              {t('adminHalalEdit.review.approveConfirm.body', { name: providerName })}
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={onClose}
              >
                {t('common.cancel')}
              </button>
              <button
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={onConfirm}
              >
                {isLoading
                  ? t('adminHalalEdit.review.approveConfirm.confirming')
                  : t('adminHalalEdit.review.approveConfirm.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
