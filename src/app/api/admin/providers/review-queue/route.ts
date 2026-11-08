import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { getReadyForReviewProviders } from '@/services/admin/providers';

/** GET /api/admin/providers/review-queue: providers ready for admin review. Admin/moderator only. */
export async function GET(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdminOrModerator(user.id))) {
      logger.warn('Forbidden access attempt to provider review queue API', {
        userId: user.id,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10));

    const result = await getReadyForReviewProviders({ limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    logger.error('Error loading provider review queue', err instanceof Error ? err : undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
