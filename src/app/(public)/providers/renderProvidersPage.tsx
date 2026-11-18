import { Suspense } from 'react';

import { getCityCenter, searchProvidersAndCommunityServices } from '@/services/providers';
import type { SearchResult } from '@/services/providers';
import { getCategoryById } from '@/services/categories';
import type { Section } from '@/config/sectionFilters';
import { parseDiscoveryQuery, parseTier } from '@/features/search/discoveryQuery';
import { resolveFilteredCategoryLabel, type FilteredCategoryLabel } from '@/lib/categoryFilter';
import { generateProviderCanonicalUrl } from '@/utils/canonicalUrl';

import { ProvidersContent } from './ProvidersContent';

const PAGE_SIZE = 12;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

function buildItemListJsonLd(results: SearchResult[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: results.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: r.name,
        url: generateProviderCanonicalUrl(r.id, SITE_URL),
        ...(r.address_street || r.address_city || r.address_zip || r.address_country
          ? {
              address: {
                '@type': 'PostalAddress',
                ...(r.address_street && { streetAddress: r.address_street }),
                ...(r.address_city && { addressLocality: r.address_city }),
                ...(r.address_zip && { postalCode: r.address_zip }),
                ...(r.address_country && { addressCountry: r.address_country }),
              },
            }
          : {}),
      },
    })),
  };
}

function toURLSearchParams(raw: { [key: string]: string | string[] | undefined }): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

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
  const rawParams = await searchParams;
  const params = toURLSearchParams(rawParams);

  const dq = parseDiscoveryQuery(params, {
    city: routeCity,
    category: routeCategory,
    section: routeSection,
  });
  const tier = parseTier(params.get('tier'));

  // #254 post-QA: when a real category filter is active, every result card
  // displays the FILTERED category — a provider that matched on a secondary
  // still shows the category the user asked for. Resolved once per render;
  // sentinels (All/Alle/…) and unrecognised values yield null (primary).
  const displayCategory = await resolveFilteredCategoryLabel(dq.category, {
    record: routeCategoryRecord ?? null,
    fetchById: getCategoryById,
  });

  let initialResults: SearchResult[] = [];
  let initialHasMore = false;
  let initialTotalCount = 0;

  // #674: the map opens on the city in scope, so look up its center in parallel.
  const mapCenterPromise = dq.location ? getCityCenter(dq.location) : Promise.resolve(null);

  try {
    const data = await searchProvidersAndCommunityServices(
      dq.q,
      dq.category,
      dq.location,
      0,
      PAGE_SIZE,
      undefined,
      dq.section,
      dq.filters,
      undefined,
      tier,
    );
    initialResults = data.results;
    initialHasMore = data.hasMore;
    initialTotalCount = data.totalCount;
  } catch (error) {
    console.error('[ProvidersPage] Server-side initial fetch failed:', error);
  }

  const mapCenter = await mapCenterPromise;

  const routeCategoryName = routeCategoryRecord?.name_en || routeCategoryRecord?.name_de || null;

  return (
    <>
      {routeCity && initialResults.length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildItemListJsonLd(initialResults)).replace(/</g, '\\u003c'),
          }}
          type="application/ld+json"
        />
      )}
      <Suspense fallback={null}>
        <ProvidersContent
          defaultLocation={dq.location || undefined}
          displayCategory={displayCategory}
          initialData={{
            results: initialResults,
            hasMore: initialHasMore,
            totalCount: initialTotalCount,
          }}
          initialFilters={dq.filters}
          initialSection={dq.section}
          mapCenter={mapCenter}
          mapCity={routeCity}
          pageCategory={routeCategory}
          routeCategoryName={routeCategoryName}
          routeCity={routeCity}
        />
      </Suspense>
    </>
  );
}
