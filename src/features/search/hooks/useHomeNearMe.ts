'use client';

import { useEffect, useMemo, useState } from 'react';
import { searchFoodNearMe, type NearMeFoodResult } from '@/services/providers';
import { filterOpenNow } from '@/utils/filterOpenNow';
import { logApp } from '@/lib/logger';

export interface UseHomeNearMeInput {
  coords: { lat: number; lon: number } | null;
  enabled: boolean;
  openNowActive: boolean;
}

export interface UseHomeNearMeOutput {
  isActive: boolean;
  results: NearMeFoodResult[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const RADIUS_KM = 25;

function truncateCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/**
 * useHomeNearMe — effect-based adapter that feeds the home List view with
 * distance-ordered, radius-filtered "near me" results (Plan 217).
 *
 * Fetches only when `enabled === true` and `coords !== null`. Applies
 * open-now filtering client-side via the shared `filterOpenNow` utility so
 * distance ordering is preserved. Stale in-flight responses are ignored by an
 * effect-cleanup flag.
 */
export function useHomeNearMe({
  coords,
  enabled,
  openNowActive,
}: UseHomeNearMeInput): UseHomeNearMeOutput {
  const isActive = enabled && coords !== null;

  const [rawResults, setRawResults] = useState<NearMeFoodResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

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
      event: 'home_list_nearme_activated',
      lat: truncateCoordinate(lat),
      lon: truncateCoordinate(lon),
      radiusKm: RADIUS_KM,
      viewMode: 'list',
    });

    void (async () => {
      try {
        const data = await searchFoodNearMe({ lat, lon, radiusKm: RADIUS_KM });
        if (cancelled) return;
        setRawResults(data);
        setIsFetching(false);
        setHasFetched(true);
        logApp('info', {
          event: 'home_list_nearme_success',
          resultCount: data.length,
          radiusKm: RADIUS_KM,
        });
      } catch (err) {
        if (cancelled) return;
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        setRawResults([]);
        setIsFetching(false);
        setHasFetched(true);
        logApp('error', {
          event: 'home_list_nearme_error',
          error: normalizedError.message,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, coords?.lat, coords?.lon, fetchKey]);

  const results = useMemo(
    () => filterOpenNow(rawResults, openNowActive),
    [rawResults, openNowActive],
  );

  const isLoading = isActive && (!hasFetched || isFetching);

  return {
    isActive,
    results,
    isLoading,
    error,
    refetch: () => setFetchKey((k) => k + 1),
  };
}
