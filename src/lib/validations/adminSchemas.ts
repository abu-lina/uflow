/**
 * Validation schemas for admin API endpoints
 */

import { z } from 'zod';

/**
 * Provider review update schema
 *
 * Plan 059/062: reviewFeedback is required when reviewStatus is 'rejected'.
 * For 'approved' and 'needs_revision', feedback remains optional.
 */
export const providerReviewUpdateSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID format'),
  reviewStatus: z.enum(['approved', 'rejected', 'needs_revision'], {
    errorMap: () => ({ message: 'reviewStatus must be one of: approved, rejected, needs_revision' }),
  }),
  reviewFeedback: z.string().max(5000).optional().nullable(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
}).refine(
  (data) => {
    if (data.reviewStatus === 'rejected') {
      return typeof data.reviewFeedback === 'string' && data.reviewFeedback.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Rejection reason is required. Please provide feedback explaining why this provider is being rejected.',
    path: ['reviewFeedback'],
  },
);
