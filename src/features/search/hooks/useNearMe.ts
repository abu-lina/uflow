'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { searchFoodNearMe, type NearMeFoodResult } from '@/services/providers';
import { filterOpenNow } from '@/utils/filterOpenNow';
import { logApp } from '@/lib/logger';

export interface UseNearMeCoords {
  lat: number;
  lon: number;
}

export interface UseNearMeOptions {
  coords: UseNearMeCoords | null;
  active: boolean;
  openNow: boolean;
  radiusKm: number;
  /** Review status filter for admin users. Defaults to 'approved' server-side. */
  reviewStatus?: string | null;
  /** When true, the hook syncs near-me state to URL params (results page). */
  urlSync?: boolean;
  /** Router replace function — required when urlSync is true. */
  router?: { replace: (url: string, options?: { scroll?: boolean }) => void };
  /** Current pathname — required when urlSync is true. */
  pathname?: string;
  /** Current search params — required when urlSync is true. */
  searchParams?: { toString(): string };
}

export interface UseNearMeResult {
  isActive: boolean;
  results: NearMeFoodResult[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function truncateCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function syncNearMeUrl(
  router: { replace: (url: string, options?: { scroll?: boolean }) => void },
  pathname: string,
  searchParams: { toString(): string },
  active: boolean,
  coords: UseNearMeCoords | null,
  radiusKm: number,
  openNow: boolean,
): void {
  const params = new URLSearchParams(searchParams.toString());

  if (active && coords) {
    params.set('near_lat', String(coords.lat));
    params.set('near_lon', String(coords.lon));
    params.set('near_radius', String(radiusKm));
  } else {
    params.delete('near_lat');
    params.delete('near_lon');
    params.delete('near_radius');
  }

  if (openNow) {
    params.set('open_now', '1');
  } else {
    params.delete('open_now');
  }

  const query = params.toString();
  router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
}

/**
 * useNearMe — single near-me hook for discovery surfaces.
 *
 * Accepts user coords, an active flag, an open-now flag, and a radius. Calls
 * `searchFoodNearMe` once when active and coords are available, then applies
 * the open-now filter client-side so distance ordering is preserved.
 *
 * Two synchronization modes:
 * - `urlSync: false` (default): in-memory mode for the home page.
 * - `urlSync: true`: writes `near_lat`/`near_lon`/`near_radius`/`open_now` to
 *   the URL via the supplied router. Callers in URL mode should derive the
 *   active/openNow/radiusKm inputs from the URL themselves.
 */
export function useNearMe({
  coords,
  active,
  openNow,
  radiusKm,
  reviewStatus,
  urlSync = false,
  router,
  pathname,
  searchParams,
}: UseNearMeOptions): UseNearMeResult {
  const isActive = active && coords !== null;

  const [rawResults, setRawResults] = useState<NearMeFoodResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const prevUrlSyncRef = useRef(urlSync);

  // Fetch near-me results whenever the active coords/radius change.
  useEffect(() => {
    let cancelled = false;

    if (!isActive || !coords) {
      setRawResults([]);
      setError(null);
      setIsFetching(false);
      setHasFetched(false);
      return () => {
        cancelled = true;
      };
    }

    const { lat, lon } = coords;

    setIsFetching(true);
    setError(null);

    logApp('info', {
      event: 'near_me_activated',
      lat: truncateCoordinate(lat),
      lon: truncateCoordinate(lon),
      radiusKm,
      urlSync,
    });

    void (async () => {
      try {
        const data = await searchFoodNearMe({ lat, lon, radiusKm, reviewStatus });
        if (cancelled) return;
        setRawResults(data);
        setIsFetching(false);
        setHasFetched(true);
        logApp('info', {
          event: 'near_me_success',
          resultCount: data.length,
          radiusKm,
        });
      } catch (err) {
        if (cancelled) return;
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        setRawResults([]);
        setIsFetching(false);
        setHasFetched(true);
        logApp('error', {
          event: 'near_me_error',
          error: normalizedError.message,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, coords?.lat, coords?.lon, radiusKm, reviewStatus, fetchKey, urlSync]);

  const results = useMemo(
    () => filterOpenNow(rawResults, openNow),
    [rawResults, openNow],
  );

  // Sync state to URL when urlSync is enabled. Guard against running on the
  // very first render when urlSync toggles from false to true to avoid
  // overwriting an existing URL.
  useEffect(() => {
    if (!urlSync || !router || !pathname || !searchParams) return;
    if (!prevUrlSyncRef.current && urlSync) {
      prevUrlSyncRef.current = urlSync;
      return;
    }
    prevUrlSyncRef.current = urlSync;

    syncNearMeUrl(router, pathname, searchParams, isActive, coords, radiusKm, openNow);
     
  }, [urlSync, isActive, coords?.lat, coords?.lon, radiusKm, openNow, router, pathname, searchParams]);

  const isLoading = isActive && (!hasFetched || isFetching);

  return {
    isActive,
    results,
    isLoading,
    error,
    refetch: () => setFetchKey((k) => k + 1),
  };
}
