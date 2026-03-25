import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { providerEditUpdateSchema } from '@/lib/validations/adminSchemas';
import { updateProviderFields } from '@/services/admin/providerEdit';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * PATCH /api/admin/edit-provider
 *
 * Update provider fields as admin/moderator.
 * Only admins and moderators can access this endpoint.
 */
export async function PATCH(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to edit-provider API',
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
        'Rate limit exceeded for edit-provider API',
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
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    const body = await request.json();
    let validatedData;
    try {
      validatedData = providerEditUpdateSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof Error) {
        logger.warn(
          'Invalid request body for edit-provider',
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

    const { providerId, ...editFields } = validatedData;

    const updatedProvider = await updateProviderFields(
      providerId,
      editFields,
      user.id
    );

    // Audit log
    await logAdminAction(
      user.id,
      'provider_edit',
      'provider',
      providerId,
      {
        editedFields: Object.keys(editFields),
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
        updated_at: updatedProvider.updated_at,
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

    let userId: string | undefined;
    try {
      const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
      const currentUser = await getUserFromCookie();
      userId = currentUser?.id;
    } catch {
      // User not available for logging
    }

    logger.error(
      'Error in edit-provider API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request), userId }
    );

    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to update provider'
      : error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
