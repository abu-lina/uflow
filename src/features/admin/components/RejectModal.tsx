'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RejectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Provider name to display in the modal */
  providerName: string;
  /** Whether a request is in progress */
  isLoading?: boolean;
  /** Called when the modal should close (cancel, outside click, or Escape) */
  onClose: () => void;
  /** Called when rejection is confirmed, with optional feedback */
  onConfirm: (feedback?: string) => void;
}

/**
 * Modal for rejecting a provider with optional feedback (Plan 058 M3)
 * 
 * Shows a compact modal/popover with:
 * - Provider name
 * - Optional feedback textarea
 * - Cancel and Confirm Rejection buttons
 * Dismisses on Escape or outside click
 */
export function RejectModal({
  isOpen,
  providerName,
  isLoading = false,
  onClose,
  onConfirm,
}: RejectModalProps) {
  const [feedback, setFeedback] = useState('');
  const titleId = useId();

  // Reset feedback when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFeedback('');
    }
  }, [isOpen]);

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

  const handleConfirm = useCallback(() => {
    onConfirm(feedback.trim() || undefined);
  }, [feedback, onConfirm]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

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
              Reject Provider
            </h2>
            
            <p className="mb-4 text-sm text-content">
              Are you sure you want to reject <strong>{providerName}</strong>?
            </p>

            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-content">
                Feedback (optional)
              </span>
              <textarea
                className="w-full rounded-lg border border-neutral-200 p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={isLoading}
                placeholder="Provide feedback or reason for rejection..."
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </label>

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
                className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-dark focus:outline-none focus:ring-2 focus:ring-danger/20 disabled:opacity-50"
                disabled={isLoading}
                type="button"
                onClick={handleConfirm}
              >
                {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
