import { NextResponse } from 'next/server';

import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { searchProvidersAndCommunityServices } from '@/services/providers';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseDiscoveryQueryForRoute, type ReviewStatus } from '@/features/search/discoveryQuery';

/** Largest page the route serves; the admin hook asks for 50. */
const MAX_PAGE_SIZE = 50;

/**
 * GET /api/providers/search
 *
 * Server boundary for providers discovery search.
 * Used by the client component for pagination after the server component
 * renders the initial page of results.
 *
 * Query params:
 *   q         - free-text search query (optional)
 *   category  - category UUID filter (optional)
 *   location  - city name filter (optional); absent or empty means no city filter.
 *   page      - page number, 0-indexed (optional, defaults to 0)
 *   pageSize  - results per page (optional, defaults to 12)
 *   status    - (admin-only) review status filter or explicit all-status scope (Plan 058 / 267)
 *
 * Caching semantics (Plan 010, updated Plan 058):
 *   - Default browse (no q, no status): public, 60s TTL, 30s stale-while-revalidate
 *   - Free-text query (q present): no-store (avoid unbounded cache keys)
 *   - Admin status filter (status present): no-store (admin-only data must not be publicly cached)
 *
 * Performance telemetry (Plan 033):
 *   - Always-on request timing with correlation ID
 *   - Dependency timing for Supabase calls
 *
 * Plan 010 — P1a: Server-first Providers discovery
 * Plan 058 — Admin status filter and caching
 */
export async function GET(request: Request): Promise<NextResponse> {
  const ctx = createRequestContext('/api/providers/search');

  try {
    const { searchParams } = new URL(request.url);
    const dq = parseDiscoveryQueryForRoute(searchParams);

    // Bound both: pageSize feeds an .in() list of ids, so a huge value would build an oversized URL.
    const rawPage = parseInt(searchParams.get('page') || '0', 10);
    const rawPageSize = parseInt(searchParams.get('pageSize') || '12', 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 0;
    const pageSize = rawPageSize >= 1 ? Math.min(rawPageSize, MAX_PAGE_SIZE) : 12;

    // Plan 058: Admin status filter
    let adminOptions: { status: ReviewStatus; isAdmin: true } | undefined;

    if (dq.statusError) {
      return NextResponse.json(
        { error: dq.statusError },
        { status: 400, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    if (dq.status) {
      // Status filter requires admin/moderator authorization
      const user = await getUserFromCookie();
      if (!user) {
        return NextResponse.json(
          { error: 'Admin or Moderator access required for status filter' },
          { status: 403, headers: { 'X-Correlation-ID': ctx.correlationId } },
        );
      }

      const hasAdminAccess = await isAdminOrModerator(user.id);
      if (!hasAdminAccess) {
        return NextResponse.json(
          { error: 'Admin or Moderator access required for status filter' },
          { status: 403, headers: { 'X-Correlation-ID': ctx.correlationId } },
        );
      }

      adminOptions = { status: dq.status, isAdmin: true };
    }

    // Admin queries need service-role client to bypass RLS
    const adminClient = adminOptions ? getSupabaseAdmin() : undefined;

    const data = await measureDependency(ctx, 'supabase.providers.search', () =>
      searchProvidersAndCommunityServices(
        dq.q,
        dq.category,
        dq.location,
        page,
        pageSize,
        adminOptions,
        dq.section,
        dq.filters,
        adminClient,
        dq.tier,
      ),
    );

    // Apply caching headers per Plan 010/058 caching semantics
    // Admin-filtered responses must use no-store to prevent CDN from caching admin-only data
    const cacheControl =
      dq.q || dq.status || dq.filters || dq.tier
        ? 'no-store'
        : 'public, s-maxage=60, stale-while-revalidate=30';

    logRequestTiming(ctx);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
        'X-Correlation-ID': ctx.correlationId,
      },
    });
  } catch (error) {
    logRequestTiming(ctx);
    console.error('[API /providers/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search providers' },
      { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  }
}
