/**
 * GET /api/admin/enrichment/candidates
 * POST /api/admin/enrichment/candidates (approve/reject/bulk-approve)
 *
 * Plan 065, Milestone 3 — Admin Enrichment Review Surface
 *
 * Protected route: admin/moderator only.
 * Uses service-role Supabase client for writes.
 */

import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import {
  getPendingCandidates,
  approveCandidate,
  rejectCandidate,
  bulkApproveByProvider,
} from '@/services/admin/enrichment';

/**
 * GET /api/admin/enrichment/candidates
 *
 * List pending enrichment candidates.
 * Query params: providerId (optional), limit, offset
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
      logger.warn('Forbidden access attempt to enrichment candidates API', {
        userId: user.id,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId') ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

    const result = await getPendingCandidates({ providerId, limit, offset });

    return NextResponse.json({
      data: result.data,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    });
  } catch (err) {
    logger.error(
      'Error fetching enrichment candidates',
      err instanceof Error ? err : undefined,
      { error: err instanceof Error ? err.message : String(err) }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/enrichment/candidates
 *
 * Actions: approve, reject, bulk-approve
 *
 * Body:
 * {
 *   action: 'approve' | 'reject' | 'bulk-approve',
 *   candidateId?: string,    // required for approve/reject
 *   providerId?: string,     // required for bulk-approve
 * }
 */
export async function POST(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn('Forbidden access attempt to enrichment action API', {
        userId: user.id,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting — consistent with other admin write routes (review-provider, needs)
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited =
      !rateLimiters.adminReview.perHour(identifier) ||
      !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      logger.warn('Rate limit exceeded for enrichment action API', {
        userId: user.id,
        identifier,
        ...getRequestMetadata(request),
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action, candidateId, providerId } = body as {
      action?: string;
      candidateId?: string;
      providerId?: string;
    };

    if (!action || !['approve', 'reject', 'bulk-approve'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, bulk-approve' },
        { status: 400 }
      );
    }

    // ─── Approve ──────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!candidateId) {
        return NextResponse.json(
          { error: 'candidateId is required for approve action' },
          { status: 400 }
        );
      }

      const result = await approveCandidate(candidateId, user.id);

      if (!result.success) {
        const statusCode = result.error?.includes('admin-controlled') ? 403 : 400;
        return NextResponse.json({ error: result.error }, { status: statusCode });
      }

      await logAdminAction(
        user.id,
        'enrichment_approve',
        'provider',
        candidateId,
        { candidateId },
        { ipAddress: getClientIp(request), userAgent: getUserAgent(request) }
      );

      return NextResponse.json({ success: true });
    }

    // ─── Reject ───────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (!candidateId) {
        return NextResponse.json(
          { error: 'candidateId is required for reject action' },
          { status: 400 }
        );
      }

      const result = await rejectCandidate(candidateId, user.id);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await logAdminAction(
        user.id,
        'enrichment_reject',
        'provider',
        candidateId,
        { candidateId },
        { ipAddress: getClientIp(request), userAgent: getUserAgent(request) }
      );

      return NextResponse.json({ success: true });
    }

    // ─── Bulk Approve ─────────────────────────────────────────────────────
    if (action === 'bulk-approve') {
      if (!providerId) {
        return NextResponse.json(
          { error: 'providerId is required for bulk-approve action' },
          { status: 400 }
        );
      }

      const result = await bulkApproveByProvider(providerId, user.id);

      await logAdminAction(
        user.id,
        'enrichment_bulk_approve',
        'provider',
        providerId,
        {
          approved: result.approved,
          skipped: result.skipped,
          errors: result.errors,
        },
        { ipAddress: getClientIp(request), userAgent: getUserAgent(request) }
      );

      return NextResponse.json({
        success: true,
        approved: result.approved,
        skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (err) {
    logger.error(
      'Error processing enrichment action',
      err instanceof Error ? err : undefined,
      { error: err instanceof Error ? err.message : String(err) }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
