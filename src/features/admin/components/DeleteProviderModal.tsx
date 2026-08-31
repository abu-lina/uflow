'use client';

import { useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteProviderModalProps {
  isOpen: boolean;
  providerName: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProviderModal({
  isOpen,
  providerName,
  isLoading = false,
  onClose,
  onConfirm,
}: DeleteProviderModalProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

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
            <h2
              className="mb-2 text-lg font-semibold text-content-heading"
              id={titleId}
            >
              Delete Provider
            </h2>

            <p className="mb-6 text-sm text-content">
              Are you sure you want to delete <strong>{providerName}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-dark focus:outline-none focus:ring-2 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={onConfirm}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
