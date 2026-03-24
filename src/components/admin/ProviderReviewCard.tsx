'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export interface PendingProvider {
  provider_id: string;
  provider_name: string;
  provider_description?: string | null;
  provider_images: string | null;
  category_id: string | null;
  address_city: string | null;
  contact_email: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  review_feedback: string | null;
  created_at: string;
  updated_at: string;
  user_created_id: string | null;
}

interface ProviderReviewCardProps {
  provider: PendingProvider;
  onReview: (providerId: string, status: 'approved' | 'rejected' | 'needs_revision', feedback?: string, expectedUpdatedAt?: string) => Promise<void>;
  index?: number;
}

export function ProviderReviewCard({ provider, onReview, index = 0 }: ProviderReviewCardProps) {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [action, setAction] = useState<'approved' | 'rejected' | 'needs_revision' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const feedbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when feedback form is shown
  useEffect(() => {
    if (showFeedback && feedbackTextareaRef.current) {
      feedbackTextareaRef.current.focus();
    }
  }, [showFeedback]);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onReview(provider.provider_id, 'approved', undefined, provider.updated_at);
      toast.success('Provider approved successfully');
    } catch {
      // Parent (AdminProvidersPageContent.handleReview) already shows an error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    if (!showFeedback) {
      setShowFeedback(true);
      setAction('rejected');
      return;
    }
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmReject = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    try {
      await onReview(provider.provider_id, 'rejected', feedback, provider.updated_at);
      toast.success('Provider rejected');
    } catch {
      // Parent (AdminProvidersPageContent.handleReview) already shows an error toast
    } finally {
      setIsLoading(false);
      setShowFeedback(false);
      setFeedback('');
      setAction(null);
    }
  };

  const handleNeedsRevision = () => {
    if (!showFeedback) {
      setShowFeedback(true);
      setAction('needs_revision');
      return;
    }
    submitRevision();
  };

  const submitRevision = async () => {
    setIsLoading(true);
    try {
      await onReview(provider.provider_id, 'needs_revision', feedback, provider.updated_at);
      toast.success('Revision requested');
    } catch {
      // Parent (AdminProvidersPageContent.handleReview) already shows an error toast
    } finally {
      setIsLoading(false);
      setShowFeedback(false);
      setFeedback('');
      setAction(null);
    }
  };

  const handleCancel = () => {
    setShowFeedback(false);
    setFeedback('');
    setAction(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Parse images
  let imageUrl: string | null = null;
  try {
    if (provider.provider_images) {
      const images = typeof provider.provider_images === 'string' 
        ? JSON.parse(provider.provider_images) 
        : provider.provider_images;
      if (images?.urls && images.urls.length > 0) {
        imageUrl = images.urls[0];
      }
    }
  } catch {
    // Ignore parse errors
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-neutral-light p-4 md:p-6 shadow-sm"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      transition={prefersReducedMotion ? {} : { duration: 0.3, delay: index * 0.05 }}
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {imageUrl && (
          <div className="flex-shrink-0 relative w-full h-48 md:w-32 md:h-32">
            <Image
              fill
              alt={`${provider.provider_name} provider image`}
              className="object-cover rounded-lg"
              sizes="(max-width: 768px) 100vw, 128px"
              src={imageUrl}
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-semibold mb-4 text-content-heading">{provider.provider_name}</h3>
          
          {provider.provider_description && (
            <p className="text-content mb-4 text-sm md:text-base">{provider.provider_description}</p>
          )}
          
          <div className="text-sm text-content-muted space-y-2 mb-4" role="list">
            {provider.address_city && (
              <p role="listitem">📍 {provider.address_city}</p>
            )}
            {provider.contact_email && (
              <p role="listitem">
                ✉️ <a className="hover:underline" href={`mailto:${provider.contact_email}`}>{provider.contact_email}</a>
              </p>
            )}
            <p role="listitem">📅 Created: {new Date(provider.created_at).toLocaleDateString()}</p>
          </div>

          {provider.review_feedback && (
            <div className="mb-4 p-4 bg-warning-soft border border-warning-light rounded-lg" role="alert">
              <p className="text-sm font-medium text-warning-dark mb-2">Previous Feedback:</p>
              <p className="text-sm text-warning">{provider.review_feedback}</p>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmDialog && (
            <motion.div
              animate={{ opacity: 1 }}
              aria-describedby="confirm-dialog-description"
              aria-labelledby="confirm-dialog-title"
              aria-modal="true"
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              role="dialog"
              transition={prefersReducedMotion ? {} : { duration: 0.2 }}
              onClick={() => setShowConfirmDialog(false)}
            >
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg p-6 max-w-md w-full"
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                transition={prefersReducedMotion ? {} : { duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowConfirmDialog(false);
                  }
                }}
              >
                <h2 className="text-lg font-semibold mb-2" id="confirm-dialog-title">
                  Confirm Rejection
                </h2>
                <p className="text-content mb-4" id="confirm-dialog-description">
                  Are you sure you want to reject this provider? This action cannot be undone.
                </p>
                <div className="flex gap-4 justify-end">
                  <Button
                    aria-label="Cancel rejection"
                    variant="secondary"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    aria-label="Confirm rejection"
                    loading={isLoading}
                    variant="danger"
                    onClick={confirmReject}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showFeedback ? (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
              transition={prefersReducedMotion ? {} : { duration: 0.2 }}
              onKeyDown={handleKeyDown}
            >
              <label className="sr-only" htmlFor={`feedback-${provider.provider_id}`}>
                Feedback for {provider.provider_name}
              </label>
              <textarea
                ref={feedbackTextareaRef}
                aria-label={`Feedback for ${provider.provider_name}`}
                aria-required={action === 'rejected' || action === 'needs_revision'}
                className="w-full p-4 border border-neutral rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                id={`feedback-${provider.provider_id}`}
                placeholder="Provide feedback for the provider..."
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  aria-label={`Submit ${action === 'rejected' ? 'rejection' : 'revision request'} for ${provider.provider_name}`}
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText={action === 'rejected' ? 'Rejecting...' : 'Submitting...'}
                  variant="primary"
                  onClick={() => {
                    if (action === 'rejected') {
                      handleReject();
                    } else if (action === 'needs_revision') {
                      submitRevision();
                    }
                  }}
                >
                  Submit {action === 'rejected' ? 'Rejection' : 'Revision Request'}
                </Button>
                <Button
                  aria-label="Cancel feedback"
                  disabled={isLoading}
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                aria-label={`Approve ${provider.provider_name}`}
                className="bg-success hover:bg-success-dark text-white"
                disabled={isLoading}
                loading={isLoading}
                loadingText="Approving..."
                variant="primary"
                onClick={handleApprove}
              >
                Approve
              </Button>
              <Button
                aria-label={`Reject ${provider.provider_name}`}
                disabled={isLoading}
                loading={isLoading}
                loadingText="Rejecting..."
                variant="danger"
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                aria-label={`Request revision for ${provider.provider_name}`}
                className="bg-warning hover:bg-warning-dark text-white"
                disabled={isLoading}
                loading={isLoading}
                loadingText="Requesting..."
                variant="secondary"
                onClick={handleNeedsRevision}
              >
                Request Revision
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

