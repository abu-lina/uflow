import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { updateCommunityServiceFields } from '@/services/admin/communityServices';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

const communityServiceEditSchema = z.object({
  communityServiceId: z.string().uuid('Invalid community service ID format'),
  communityServiceName: z.string().min(1).max(200).optional(),
  communityServiceDescription: z.string().max(5000).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  addressStreet: z.string().max(500).nullable().optional(),
  addressZip: z.string().max(20).nullable().optional(),
  addressCity: z.string().max(200).nullable().optional(),
  addressCountry: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().max(320).nullable().optional(),
  contactPhone: z.string().max(50).nullable().optional(),
  socialWebsite: z.string().url().max(2000).nullable().optional(),
  socialInstagram: z.string().max(200).nullable().optional(),
});

/**
 * PATCH /api/admin/edit-community-service
 *
 * Update community service fields as admin/moderator.
 * Only admins and moderators can access this endpoint.
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
        'Forbidden access attempt to edit-community-service API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting — reuse the admin review limiter
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited = !rateLimiters.adminReview.perHour(identifier) ||
                          !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      logger.warn(
        'Rate limit exceeded for edit-community-service API',
        { userId: user.id, identifier, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Guard against oversized payloads
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const body = await request.json();
    let validatedData;
    try {
      validatedData = communityServiceEditSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof Error) {
        logger.warn(
          'Invalid request body for edit-community-service',
          { body, error: validationError.message },
          { ...getRequestMetadata(request), userId: user.id }
        );
      }
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationError instanceof Error ? validationError.message : 'Validation failed',
        },
        { status: 400 }
      );
    }

    const { communityServiceId, ...editFields } = validatedData;

    const updatedCS = await updateCommunityServiceFields(
      communityServiceId,
      editFields,
      user.id
    );

    // Audit log
    await logAdminAction(
      user.id,
      'community_service_edit',
      'provider', // closest target_type in the existing audit schema
      communityServiceId,
      {
        editedFields: Object.keys(editFields),
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
        updated_at: updatedCS.updated_at,
      },
    });
  } catch (error) {
    logger.error(
      'Error in edit-community-service API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request) }
    );

    return NextResponse.json(
      { error: 'Failed to update community service' },
      { status: 500 }
    );
  }
}
