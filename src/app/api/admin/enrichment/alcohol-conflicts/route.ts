/**
 * GET /api/admin/enrichment/alcohol-conflicts?providerId=<uuid>
 *
 * Plan 193 — Lightweight endpoint for checking enrichment alcohol conflicts.
 * Used by the UI to show warnings on provider detail pages and edit forms.
 *
 * Protected route: admin/moderator only.
 * Uses service-role Supabase client via the enrichment gate service.
 */

import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { checkEnrichmentAlcoholConflict } from '@/services/admin/enrichment-gate';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * GET /api/admin/enrichment/alcohol-conflicts
 *
 * Query params:
 *   providerId (string, required) — UUID of the provider to check
 *
 * Returns:
 *   { hasConflict: boolean, conflicts: AlcoholConflictDetail[] }
 */
export async function GET(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to enrichment alcohol-conflicts API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting — consistent with other admin read endpoints
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited =
      !rateLimiters.adminReview.perHour(identifier) ||
      !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await checkEnrichmentAlcoholConflict(providerId);

    return NextResponse.json(result);
  } catch (err) {
    logger.error(
      'Error checking enrichment alcohol conflicts',
      err instanceof Error ? err : undefined,
      { error: err instanceof Error ? err.message : String(err) }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
