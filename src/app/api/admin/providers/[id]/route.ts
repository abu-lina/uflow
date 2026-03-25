import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { getProviderForAdmin } from '@/services/admin/providers';

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
