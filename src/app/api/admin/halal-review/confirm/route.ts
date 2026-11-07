import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { confirmHalalReview } from '@/services/admin/halalReviewQueue';

/** POST /api/admin/halal-review/confirm: apply the three reviewed halal values for one provider. */
export async function POST(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isAdminOrModerator(user.id))) {
      logger.warn('Forbidden access attempt to halal review confirm API', {
        userId: user.id,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 },
      );
    }

    const identifier = getClientIdentifier(request, user.id);
    if (
      !rateLimiters.adminReview.perHour(identifier) ||
      !rateLimiters.adminReview.perMinute(identifier)
    ) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const { providerId, no_alcohol, no_pork, no_gambling } = body ?? {};
    if (
      typeof providerId !== 'string' ||
      typeof no_alcohol !== 'boolean' ||
      typeof no_pork !== 'boolean' ||
      typeof no_gambling !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'providerId, no_alcohol, no_pork and no_gambling are required' },
        { status: 400 },
      );
    }

    const values = { no_alcohol, no_pork, no_gambling };
    const result = await confirmHalalReview(providerId, values, user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logAdminAction(user.id, 'halal_review_confirm', 'provider', providerId, values, {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Error confirming halal review', err instanceof Error ? err : undefined, {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
