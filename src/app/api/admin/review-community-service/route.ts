import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { communityServiceReviewUpdateSchema } from '@/lib/validations/adminSchemas';
import { updateCommunityServiceReview } from '@/services/admin/communityServices';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * PATCH /api/admin/review-community-service
 *
 * Update community service review status and feedback.
 * Only admins and moderators can access this endpoint.
 *
 * Rejection requires a non-empty feedback reason.
 * Approval and needs_revision do not require feedback.
 *
 * Request body:
 * {
 *   communityServiceId: string (required)
 *   reviewStatus: 'approved' | 'rejected' | 'needs_revision' (required)
 *   reviewFeedback?: string (required for 'rejected', optional otherwise, max 5000 chars)
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to review-community-service API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting — reuse the admin review limiter
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited =
      !rateLimiters.adminReview.perHour(identifier) ||
      !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      logger.warn(
        'Rate limit exceeded for review-community-service API',
        { userId: user.id, identifier, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    let validatedData;
    try {
      validatedData = communityServiceReviewUpdateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof Error) {
        logger.warn(
          'Invalid request body for review-community-service',
          {
            communityServiceId:
              typeof body?.communityServiceId === 'string'
                ? body.communityServiceId
                : '[invalid]',
            reviewStatus:
              typeof body?.reviewStatus === 'string' ? body.reviewStatus : '[invalid]',
            error: validationError.message,
          },
          { ...getRequestMetadata(request), userId: user.id }
        );
      }
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details:
            validationError instanceof Error ? validationError.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    const updatedCS = await updateCommunityServiceReview(
      validatedData.communityServiceId,
      validatedData.reviewStatus,
      validatedData.reviewFeedback ?? null,
      user.id
    );

    await logAdminAction(
      user.id,
      `community_service_review_${validatedData.reviewStatus}`,
      'provider', // closest target_type in the existing audit schema
      validatedData.communityServiceId,
      {
        reviewStatus: validatedData.reviewStatus,
        reviewFeedback: validatedData.reviewFeedback || null,
        communityServiceName: updatedCS.community_service_name,
      },
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    return NextResponse.json({
      data: {
        community_service_id: updatedCS.community_service_id,
        community_service_name: updatedCS.community_service_name,
        review_status: updatedCS.review_status,
        review_feedback: updatedCS.review_feedback,
        updated_at: updatedCS.updated_at,
      },
    });
  } catch (error) {
    logger.error(
      'Error in review-community-service API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request) }
    );

    return NextResponse.json(
      { error: 'Failed to update community service review' },
      { status: 500 }
    );
  }
}
