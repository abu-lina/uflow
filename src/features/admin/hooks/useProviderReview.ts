'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for handling provider review actions (approve/reject)
 * 
 * Plan 058 M3: Provides approve and reject functionality with optimistic updates
 * and cache invalidation for inline review actions in provider cards.
 */
export function useProviderReview() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingProviderId, setReviewingProviderId] = useState<string | null>(null);

  const reviewProvider = useCallback(async (
    providerId: string,
    reviewStatus: 'approved' | 'rejected' | 'needs_revision',
    reviewFeedback?: string,
  ) => {
    setIsLoading(true);
    setReviewingProviderId(providerId);

    try {
      const body: Record<string, string> = {
        providerId,
        reviewStatus,
      };

      if (reviewFeedback) {
        body.reviewFeedback = reviewFeedback;
      }

      const response = await fetch('/api/admin/review-provider', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Review failed with status ${response.status}`);
      }

      // Invalidate providers query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['providers'] });

      return await response.json();
    } finally {
      setIsLoading(false);
      setReviewingProviderId(null);
    }
  }, [queryClient]);

  const approveProvider = useCallback((providerId: string) => {
    return reviewProvider(providerId, 'approved');
  }, [reviewProvider]);

  const rejectProvider = useCallback((providerId: string, feedback?: string) => {
    return reviewProvider(providerId, 'rejected', feedback);
  }, [reviewProvider]);

  return {
    approveProvider,
    rejectProvider,
    isLoading,
    reviewingProviderId,
  };
}
