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

/**
 * Provider edit update schema (admin/moderator editing provider fields)
 */
export const providerEditUpdateSchema = z.object({
  providerId: z.string().uuid('Invalid provider ID format'),
  providerName: z.string().min(1).max(200).optional(),
  providerDescription: z.string().max(5000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  listingType: z.enum(['food', 'business']).nullable().optional(),
  addressStreet: z.string().max(500).nullable().optional(),
  addressZip: z.string().max(20).nullable().optional(),
  addressCity: z.string().max(200).nullable().optional(),
  addressCountry: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  socialWebsite: z.string().url().max(2000).nullable().optional(),
  socialInstagram: z.string().max(200).nullable().optional(),
  providerImages: z.string().max(10000).nullable().optional()
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        try {
          const parsed = JSON.parse(val);
          return parsed !== null
            && typeof parsed === 'object'
            && Array.isArray(parsed.urls)
            && parsed.urls.every((u: unknown) => typeof u === 'string');
        } catch {
          return false;
        }
      },
      { message: 'providerImages must be valid JSON with shape { urls: string[] }' }
    ),
  offersIds: z.array(z.string().uuid()).optional(),
  needsIds: z.array(z.string().uuid()).optional(),
  communityServiceIds: z.array(z.string().uuid()).optional(),
});

/**
 * Community service edit update schema (admin/moderator editing community service fields)
 * Plan 083 — M1
 *
 * Images are stored as Postgres TEXT[] (native array), not JSON string.
 * The adapter layer (M2 edit page) converts between TEXT[] and JSON string
 * for the ProviderEditForm, but the API contract uses the native format.
 */
export const communityServiceEditUpdateSchema = z.object({
  communityServiceId: z.string().uuid('Invalid community service ID format'),
  serviceName: z.string().min(1).max(200).optional(),
  serviceDescription: z.string().max(5000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  addressStreet: z.string().max(500).nullable().optional(),
  addressZip: z.string().max(20).nullable().optional(),
  addressCity: z.string().max(200).nullable().optional(),
  addressCountry: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  socialWebsite: z.string().url().max(2000).nullable().optional(),
  socialInstagram: z.string().max(200).nullable().optional(),
  communityServiceImages: z.array(z.string().url()).max(20).nullable().optional(),
  offersIds: z.array(z.string().uuid()).optional(),
  needsIds: z.array(z.string().uuid()).optional(),
});

/**
 * Community service review update schema (admin/moderator setting review status)
 * Plan 083 — M1
 *
 * Mirrors providerReviewUpdateSchema with community-service-specific field names.
 */
export const communityServiceReviewUpdateSchema = z.object({
  communityServiceId: z.string().uuid('Invalid community service ID format'),
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
    message: 'Rejection reason is required. Please provide feedback explaining why this community service is being rejected.',
    path: ['reviewFeedback'],
  },
);
