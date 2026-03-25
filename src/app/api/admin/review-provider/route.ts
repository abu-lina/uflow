import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { providerReviewUpdateSchema } from '@/lib/validations/adminSchemas';
import { updateProviderReview } from '@/services/admin/providers';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * PATCH /api/admin/review-provider
 * 
 * Update provider review status and feedback.
 * Only admins and moderators can access this endpoint.
 * 
 * Plan 059/062: Rejection requires a non-empty feedback reason.
 * Approval and needs_revision do not require feedback.
 * 
 * Request body:
 * {
 *   providerId: string (required)
 *   reviewStatus: 'approved' | 'rejected' | 'needs_revision' (required)
 *   reviewFeedback?: string (required for 'rejected', optional otherwise, max 5000 chars)
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    // Check authentication
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization - only admin and moderator can review providers
    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to review-provider API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting - 20 reviews per hour, 5 per minute per user
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited = !rateLimiters.adminReview.perHour(identifier) || 
                          !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      logger.warn(
        'Rate limit exceeded for review-provider API',
        { userId: user.id, identifier, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Check request size (max 1MB)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData;
    try {
      validatedData = providerReviewUpdateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof Error) {
        logger.warn(
          'Invalid request body',
          {
            // Log only known keys — never log raw body (log injection / sensitive bleed risk)
            providerId: typeof body?.providerId === 'string' ? body.providerId : '[invalid]',
            reviewStatus: typeof body?.reviewStatus === 'string' ? body.reviewStatus : '[invalid]',
            error: validationError.message,
          },
          { ...getRequestMetadata(request), userId: user.id }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body', details: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Update provider review using service layer
    // Sanitization is handled by the service (single boundary)
    const updatedProvider = await updateProviderReview(
      validatedData.providerId,
      validatedData.reviewStatus,
      validatedData.reviewFeedback ?? null,
      validatedData.expectedUpdatedAt
    );

    // Log admin action for audit
    await logAdminAction(
      user.id,
      `provider_review_${validatedData.reviewStatus}`,
      'provider',
      validatedData.providerId,
      {
        reviewStatus: validatedData.reviewStatus,
        reviewFeedback: validatedData.reviewFeedback || null,
        providerName: updatedProvider.provider_name,
      },
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    return NextResponse.json({
      data: {
        provider_id: updatedProvider.provider_id,
        provider_name: updatedProvider.provider_name,
        review_status: updatedProvider.review_status,
        review_feedback: updatedProvider.review_feedback,
      },
    });
  } catch (error) {
    // Handle concurrency conflict
    if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
      return NextResponse.json(
        { error: 'This provider was modified by another reviewer. Please refresh and try again.' },
        { status: 409 }
      );
    }

    // Get user for logging if available
    let userId: string | undefined;
    try {
      const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
      const currentUser = await getUserFromCookie();
      userId = currentUser?.id;
    } catch {
      // User not available for logging
    }

    logger.error(
      'Error in review-provider API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request), userId }
    );

    // Sanitize error message in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to review provider'
      : error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
