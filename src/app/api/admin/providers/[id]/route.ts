import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { getProviderForAdmin, deleteProvider } from '@/services/admin/providers';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * GET /api/admin/providers/[id]
 *
 * Fetch a single provider by ID for admin editing.
 * Only admins and moderators can access this endpoint.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to admin providers API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    const { id: providerId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(providerId)) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
    }

    const provider = await getProviderForAdmin(providerId);

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ data: provider });
  } catch (error) {
    logger.error(
      'Error in admin providers API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request) }
    );

    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/providers/[id]
 *
 * Delete a provider permanently.
 * All child tables have ON DELETE CASCADE, so cleanup is automatic.
 * Only admins and moderators can access this endpoint.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to admin providers delete API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting - 20 deletes per hour, 5 per minute per admin
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited = !rateLimiters.adminReview.perHour(identifier) ||
                          !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      logger.warn(
        'Rate limit exceeded for admin providers delete API',
        { userId: user.id, identifier, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { id: providerId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(providerId)) {
      return NextResponse.json({ error: 'Invalid provider ID' }, { status: 400 });
    }

    await deleteProvider(providerId);

    // Log admin action for audit
    await logAdminAction(
      user.id,
      'provider_deleted',
      'provider',
      providerId,
      { providerId },
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof Error && error.message === 'Provider not found') {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
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
      'Error in admin providers delete API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request), userId }
    );

    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to delete provider'
      : error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
