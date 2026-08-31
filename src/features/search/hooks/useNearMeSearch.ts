'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchFoodNearMe, type NearMeFoodResult } from '@/services/providers';
import { filterOpenNow } from '@/utils/filterOpenNow';
import type { Section } from '@/providers/search-provider';

export interface UseNearMeSearchResult {
  isNearMeMode: boolean;
  results: NearMeFoodResult[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Minimal shape needed from a URLSearchParams-like object (also satisfied by
 * Next.js's ReadonlyURLSearchParams, which omits mutating methods). */
interface SearchParamsLike {
  get(key: string): string | null;
}

/**
 * useNearMeSearch — consumes the `near_lat` / `near_lon` / `near_radius` /
 * `open_now` URL params emitted by the search page's quick-filter chip row
 * (Plan 196, M4) and returns distance-ordered "near me" results.
 *
 * Scoped to the food section only, matching the `search_food_near_me` RPC
 * (migration 120). Open-now filtering is applied client-side via the single
 * tested `getOpenStatus` source of truth (Analysis 196 #3) — filtering never
 * reorders the already distance-sorted RPC output (Critic F4).
 */
export function useNearMeSearch(
  searchParams: SearchParamsLike,
  section: Section,
): UseNearMeSearchResult {
  const nearLatParam = searchParams.get('near_lat');
  const nearLonParam = searchParams.get('near_lon');
  const nearRadiusParam = searchParams.get('near_radius');
  const openNowParam = searchParams.get('open_now') === '1';

  const lat = nearLatParam !== null ? Number(nearLatParam) : null;
  const lon = nearLonParam !== null ? Number(nearLonParam) : null;
  const radiusKm = nearRadiusParam !== null && Number(nearRadiusParam) > 0 ? Number(nearRadiusParam) : 5;

  const isNearMeMode =
    section === 'food' &&
    lat !== null &&
    lon !== null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon);

  const {
    data: rawResults = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['near-me-food', lat, lon, radiusKm],
    queryFn: () => searchFoodNearMe({ lat: lat as number, lon: lon as number, radiusKm }),
    enabled: isNearMeMode,
    staleTime: 60 * 1000,
  });

  const results = useMemo(
    () => filterOpenNow(rawResults, openNowParam),
    [rawResults, openNowParam],
  );

  return {
    isNearMeMode,
    results,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      void refetch();
    },
  };
}
