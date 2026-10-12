import { Suspense } from 'react';

import { searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';
import { getCategoryById } from '@/services/categories';
import { inferSectionFromCategory, SECTION_META } from '@/config/sectionFilters';
import type { Section } from '@/providers/search-provider';
import {
  SEARCH_FILTER_KEY_SET,
  type SearchFilterKey,
} from '@/features/search/constants/filterKeys';
import { resolveFilteredCategoryLabel, type FilteredCategoryLabel } from '@/lib/categoryFilter';

import { ProvidersContent } from './ProvidersContent';

const PAGE_SIZE = 12;

export async function renderProvidersPage(opts: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  routeSection?: Section;
  routeCategory?: string | null;
  routeCity?: string | null;
  /** #254 post-QA: the /food/[city]/[category] route already fetched the
      category row for its 404 check; passing it avoids a second query. */
  routeCategoryRecord?: FilteredCategoryLabel | null;
}) {
  const { searchParams, routeSection, routeCategory, routeCity, routeCategoryRecord } = opts;
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';

  const category = routeCategory ?? (typeof params.category === 'string' ? params.category : null);

  const locationParam = routeCity ?? (typeof params.location === 'string' ? params.location : '');
  const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
  const location = isLegacyEverywhere ? '' : locationParam;

  const resolvedSection =
    routeSection ??
    (() => {
      const sectionParam = typeof params.section === 'string' ? params.section : null;
      const categoryParam = typeof params.category === 'string' ? params.category : null;
      const rawSection: Section =
        sectionParam === 'food' ||
        sectionParam === 'ummah' ||
        sectionParam === 'store' ||
        sectionParam === 'business'
          ? sectionParam === 'business'
            ? 'store'
            : sectionParam
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

  // #254 post-QA: when a real category filter is active, every result card
  // displays the FILTERED category — a provider that matched on a secondary
  // still shows the category the user asked for. Resolved once per render;
  // sentinels (All/Alle/…) and unrecognised values yield null (primary).
  const displayCategory = await resolveFilteredCategoryLabel(category, {
    record: routeCategoryRecord ?? null,
    fetchById: getCategoryById,
  });

  let initialResults: SearchResult[] = [];
  let initialHasMore = false;
  let initialTotalCount = 0;

  try {
    const data = await searchProvidersAndCommunityServices(
      query,
      category,
      location,
      0,
      PAGE_SIZE,
      undefined,
      section,
      filters,
    );
    initialResults = data.results;
    initialHasMore = data.hasMore;
    initialTotalCount = data.totalCount;
  } catch (error) {
    console.error('[ProvidersPage] Server-side initial fetch failed:', error);
  }

  return (
    <Suspense fallback={null}>
      <ProvidersContent
        defaultLocation={location || undefined}
        displayCategory={displayCategory}
        initialData={{
          results: initialResults,
          hasMore: initialHasMore,
          totalCount: initialTotalCount,
        }}
        initialFilters={filters}
        initialSection={section}
      />
    </Suspense>
  );
}
