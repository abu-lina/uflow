import { NextResponse } from 'next/server';

import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { searchProvidersAndCommunityServices } from '@/services/providers';

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
 *   location  - city name filter (optional, defaults to "Everywhere")
 *   page      - page number, 0-indexed (optional, defaults to 0)
 *   pageSize  - results per page (optional, defaults to 12)
 *
 * Caching semantics (Plan 010):
 *   - Default browse (no q): public, 60s TTL, 30s stale-while-revalidate
 *   - Free-text query (q present): no-store (avoid unbounded cache keys)
 *
 * Performance telemetry (Plan 033):
 *   - Always-on request timing with correlation ID
 *   - Dependency timing for Supabase calls
 *
 * Plan 010 — P1a: Server-first Providers discovery
 */
export async function GET(request: Request): Promise<NextResponse> {
  const ctx = createRequestContext('/api/providers/search');

  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || null;
    const location = searchParams.get('location') || 'Everywhere';
    const page = parseInt(searchParams.get('page') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);

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
        ),
    );

    // Apply caching headers per Plan 010 caching semantics
    const cacheControl = query
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
