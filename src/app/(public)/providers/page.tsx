import { Suspense } from 'react';

import { searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';
import { inferSectionFromCategory } from '@/config/sectionFilters';
import type { Section } from '@/providers/search-provider';
import { SEARCH_FILTER_KEY_SET, type SearchFilterKey } from '@/features/search/constants/filterKeys';

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

  // Plan 089 M8: Infer section from URL params with legacy URL fallback (D9)
  // Priority: ?section= > infer from ?category= (only when category param IS present) > default 'food'
  const sectionParam = typeof params.section === 'string' ? params.section : null;
  const categoryParam = typeof params.category === 'string' ? params.category : null;
  const section: Section =
    sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store' || sectionParam === 'business'
      ? (sectionParam === 'business' ? 'store' : sectionParam)
      : categoryParam
        ? inferSectionFromCategory(categoryParam)
        : 'food'; // D9: default when no section and no category

  const rawFilters = typeof params.filters === 'string' ? params.filters : '';
  const parsedFilters = rawFilters
    .split(',')
    .map((key) => key.trim())
    .filter((key): key is SearchFilterKey => SEARCH_FILTER_KEY_SET.has(key));
  const filters = parsedFilters.length > 0 ? parsedFilters : undefined;

  // Server-side initial fetch — first page of results rendered into HTML
  let initialResults: SearchResult[] = [];
  let initialHasMore = false;

  try {
    const data = await searchProvidersAndCommunityServices(query, category, location, 0, PAGE_SIZE, undefined, section, filters);
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
        initialFilters={filters}
      />
    </Suspense>
  );
}
