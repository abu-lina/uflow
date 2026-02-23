import { Suspense } from 'react';

import { searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';

import { ProvidersContent } from './ProvidersContent';

const PAGE_SIZE = 12;

/**
 * Providers discovery page (Server Component).
 *
 * Fetches the initial page of results on the server for faster time-to-content,
 * then hands off to ProvidersContent (Client Component) for interactivity
 * and infinite-scroll pagination.
 *
 * Plan 010 — P1a: Server-first Providers discovery
 */
export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const category = typeof params.category === 'string' ? params.category : null;
  // Map legacy "Everywhere" and "Überall" to empty string (LOCATION_ALL sentinel)
  // Plan 017: Canonical sentinel for "all locations" is empty string
  const locationParam = typeof params.location === 'string' ? params.location : '';
  const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
  const location = isLegacyEverywhere ? '' : locationParam;

  // Server-side initial fetch — first page of results rendered into HTML
  let initialResults: SearchResult[] = [];
  let initialHasMore = false;

  try {
    const data = await searchProvidersAndCommunityServices(query, category, location, 0, PAGE_SIZE);
    initialResults = data.results;
    initialHasMore = data.hasMore;
  } catch (error) {
    // If server fetch fails, the client component will re-fetch via React Query
    console.error('[ProvidersPage] Server-side initial fetch failed:', error);
  }

  return (
    <Suspense fallback={null}>
      <ProvidersContent
        initialData={{
          results: initialResults,
          hasMore: initialHasMore,
        }}
      />
    </Suspense>
  );
}
