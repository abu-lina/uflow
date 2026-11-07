import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { getHalalReviewQueue } from '@/services/admin/halalReviewQueue';

/** GET /api/admin/halal-review: providers with pending halal candidates, oldest first. Admin/moderator only. */
export async function GET(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdminOrModerator(user.id))) {
      logger.warn('Forbidden access attempt to halal review API', {
        userId: user.id,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 },
      );
    }

    return NextResponse.json({ data: await getHalalReviewQueue() });
  } catch (err) {
    logger.error('Error loading halal review queue', err instanceof Error ? err : undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
