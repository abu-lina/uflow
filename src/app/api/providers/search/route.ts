import { NextResponse } from 'next/server';

import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { searchProvidersAndCommunityServices } from '@/services/providers';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { isAdminOrModerator } from '@/lib/auth/roles';
import type { Section } from '@/providers/search-provider';
import { SEARCH_FILTER_KEY_SET, type SearchFilterKey } from '@/features/search/constants/filterKeys';

/** Valid review status values for admin filtering (Plan 058) */
const VALID_REVIEW_STATUSES = ['approved', 'pending', 'rejected', 'needs_revision'] as const;
type ReviewStatus = typeof VALID_REVIEW_STATUSES[number];

function isValidReviewStatus(value: string): value is ReviewStatus {
  return VALID_REVIEW_STATUSES.includes(value as ReviewStatus);
}

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
 *   location  - city name filter (optional); absent, empty, "Everywhere", and "Überall" all mean
 *               no city filter (LOCATION_ALL = ''). Mirror normalization from page.tsx (Plan 044).
 *   page      - page number, 0-indexed (optional, defaults to 0)
 *   pageSize  - results per page (optional, defaults to 12)
 *   status    - (admin-only) review status filter: approved, pending, rejected, needs_revision (Plan 058)
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

    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || null;
    // Normalize location: absent (null) and empty string both mean LOCATION_ALL ('').
    // Legacy localized labels from old links/bookmarks are also mapped to ''.
    // Using ?? instead of || preserves '' as a valid sentinel value (Plan 044).
    const rawLocation = searchParams.get('location') ?? '';
    const location =
      rawLocation === 'Everywhere' || rawLocation === 'Überall' ? '' : rawLocation;
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
    
    // Plan 058: Admin status filter
    const statusParam = searchParams.get('status');
    let adminOptions: { status: ReviewStatus; isAdmin: true } | undefined;

    // Plan 089: Section filter
    const sectionParam = searchParams.get('section');
    const section: Section | undefined =
      sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store' || sectionParam === 'business'
        ? (sectionParam === 'business' ? 'store' : sectionParam as Section)
        : undefined;

    const rawFilters = searchParams.get('filters') || '';
    const parsedFilters = rawFilters
      .split(',')
      .map((key) => key.trim())
      .filter((key): key is SearchFilterKey => SEARCH_FILTER_KEY_SET.has(key));
    const filters = parsedFilters.length > 0 ? parsedFilters : undefined;
    
    if (statusParam) {
      // Validate status value first
      if (!isValidReviewStatus(statusParam)) {
        return NextResponse.json(
          { error: `Invalid status value: ${statusParam}. Valid values are: ${VALID_REVIEW_STATUSES.join(', ')}` },
          { status: 400, headers: { 'X-Correlation-ID': ctx.correlationId } },
        );
      }
      
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
      
      adminOptions = { status: statusParam, isAdmin: true };
    }

    const data = await measureDependency(
      ctx,
      'supabase.providers.search',
      () =>
        searchProvidersAndCommunityServices(
          query,
          category,
          location,
          page,
          pageSize,
          adminOptions,
          section,
          filters,
        ),
    );

    // Apply caching headers per Plan 010/058 caching semantics
    // Admin-filtered responses must use no-store to prevent CDN from caching admin-only data
    const cacheControl = query || statusParam || filters
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
