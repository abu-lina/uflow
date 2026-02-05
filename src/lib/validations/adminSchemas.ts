/**
 * Validation schemas for admin API endpoints
 */

import { z } from 'zod';

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Review status schema
 */
export const reviewStatusSchema = z.enum(['pending', 'needs_revision']);

/**
 * Provider review update schema
 */
export const providerReviewUpdateSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID format'),
  reviewStatus: z.enum(['approved', 'rejected', 'needs_revision'], {
    errorMap: () => ({ message: 'reviewStatus must be one of: approved, rejected, needs_revision' }),
  }),
  reviewFeedback: z.string().max(5000).optional().nullable(),
});

/**
 * Query parameters for pending providers
 */
export const pendingProvidersQuerySchema = z.object({
  status: reviewStatusSchema.default('pending'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
