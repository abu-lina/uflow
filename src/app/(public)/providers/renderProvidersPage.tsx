import { Suspense } from 'react';

import { searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';
import { inferSectionFromCategory, SECTION_META } from '@/config/sectionFilters';
import type { Section } from '@/providers/search-provider';
import { SEARCH_FILTER_KEY_SET, type SearchFilterKey } from '@/features/search/constants/filterKeys';

import { ProvidersContent } from './ProvidersContent';

const PAGE_SIZE = 12;

export async function renderProvidersPage(opts: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  routeSection?: Section;
  routeCategory?: string | null;
  routeCity?: string | null;
}) {
  const { searchParams, routeSection, routeCategory, routeCity } = opts;
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';

  const category = routeCategory ?? (typeof params.category === 'string' ? params.category : null);

  const locationParam = routeCity ?? (typeof params.location === 'string' ? params.location : '');
  const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
  const location = isLegacyEverywhere ? '' : locationParam;

  const resolvedSection = routeSection ?? (() => {
    const sectionParam = typeof params.section === 'string' ? params.section : null;
    const categoryParam = typeof params.category === 'string' ? params.category : null;
    const rawSection: Section =
      sectionParam === 'food' || sectionParam === 'ummah' || sectionParam === 'store' || sectionParam === 'business'
        ? (sectionParam === 'business' ? 'store' : sectionParam)
        : categoryParam
          ? inferSectionFromCategory(categoryParam)
          : 'food';
    return rawSection;
  })();
  const section: Section = SECTION_META[resolvedSection].active ? resolvedSection : 'food';

  const rawFilters = typeof params.filters === 'string' ? params.filters : '';
  const parsedFilters = rawFilters
    .split(',')
    .map((key) => key.trim())
    .filter((key): key is SearchFilterKey => SEARCH_FILTER_KEY_SET.has(key));
  const filters = parsedFilters.length > 0 ? parsedFilters : undefined;

  let initialResults: SearchResult[] = [];
  let initialHasMore = false;

  try {
    const data = await searchProvidersAndCommunityServices(query, category, location, 0, PAGE_SIZE, undefined, section, filters);
    initialResults = data.results;
    initialHasMore = data.hasMore;
  } catch (error) {
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
