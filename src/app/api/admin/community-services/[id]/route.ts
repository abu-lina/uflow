import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { getCommunityServiceForAdmin } from '@/services/admin/communityServices';

/**
 * GET /api/admin/community-services/[id]
 *
 * Fetch a single community service by ID for admin editing.
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
        'Forbidden access attempt to admin community-services API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    const { id: communityServiceId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityServiceId)) {
      return NextResponse.json({ error: 'Invalid community service ID' }, { status: 400 });
    }

    const communityService = await getCommunityServiceForAdmin(communityServiceId);

    if (!communityService) {
      return NextResponse.json({ error: 'Community service not found' }, { status: 404 });
    }

    return NextResponse.json({ data: communityService });
  } catch (error) {
    logger.error(
      'Error in admin community-services API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      { ...getRequestMetadata(request) }
    );

    return NextResponse.json(
      { error: 'Failed to fetch community service' },
      { status: 500 }
    );
  }
}
