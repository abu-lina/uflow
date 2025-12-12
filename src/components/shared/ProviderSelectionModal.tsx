'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';
import type { WaitlistResponse } from '@/types/waitlist';

interface ProviderSelectionModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ProviderSelectionModal({ 
  isOpen, 
  email,
  onClose, 
  onComplete 
}: ProviderSelectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitWaitlist = useCallback(async (isProvider: boolean | null) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          isProvider,
        }),
      });

      const data: WaitlistResponse = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          setError(data.error?.message || "You're already on the waitlist!");
        } else if (response.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError(data.error?.message || 'An error occurred. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - close modal and show success screen
      console.log('[Waitlist] Successfully joined:', { email, isProvider });
      onClose();
      onComplete();
      
    } catch (err) {
      console.error('[Waitlist] Submit error:', err);
      setError('Network error. Please check your connection.');
      setIsSubmitting(false);
    }
  }, [email, onClose, onComplete]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      // Submit with isProvider = null when closing without selection
      submitWaitlist(null);
    }, 300);
  }, [isSubmitting, submitWaitlist]);

  const handleSelection = async (isProvider: boolean) => {
    if (isSubmitting) return;
    await submitWaitlist(isProvider);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Focus first button
      setTimeout(() => {
        const firstButton = modalRef.current?.querySelector('button:not([aria-label="Close"])') as HTMLButtonElement;
        firstButton?.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, handleClose]);

  if (!isOpen && !isClosing) {
    return null;
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        aria-describedby="provider-modal-description"
        aria-labelledby="provider-modal-title"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[999999] flex items-end justify-center md:inset-0 md:items-center"
        role="dialog"
      >
        {/* Modal Content */}
        <div
          className="relative flex w-full max-w-[392px] flex-col items-center gap-3 rounded-t-[32px] bg-white p-4 md:rounded-[24px] md:max-w-[480px] md:p-6"
          style={{
            transform: isClosing 
              ? 'translateY(100%) scale(0.95)' 
              : 'translateY(0) scale(1)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Close Button */}
          <div className="flex w-full justify-end">
            <button
              aria-label="Close"
              className="flex size-8 items-center justify-center rounded-full hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              disabled={isSubmitting}
              type="button"
              onClick={handleClose}
            >
              <Icon className="size-6 text-[#232323]" icon="material-symbols:close-rounded" />
            </button>
          </div>

          {/* Content */}
          <div className="flex w-full flex-col items-center gap-6 px-2 pb-2">
            {/* Question */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h2
                className="font-inter-tight text-xl font-semibold leading-tight text-[#232323] md:text-2xl"
                id="provider-modal-title"
              >
                Are you joining as a provider?
              </h2>
              <p
                className="font-inter text-sm text-[#555555] md:text-base"
                id="provider-modal-description"
              >
                Let us know so we can support you in getting your services listed early.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div
                aria-live="polite"
                className="w-full rounded-xl bg-[#FEE] px-4 py-3 text-center text-sm text-[#D86363]"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex w-full flex-col gap-3">
              <Button
                fullWidth
                aria-label="Join as provider"
                disabled={isSubmitting}
                loading={isSubmitting}
                size="lg"
                variant="primary"
                onClick={() => handleSelection(true)}
              >
                I plan to offer services
              </Button>
              
              <Button
                fullWidth
                aria-label="Join as regular user"
                disabled={isSubmitting}
                size="lg"
                variant="secondary"
                onClick={() => handleSelection(false)}
              >
                I&apos;m here as a customer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

