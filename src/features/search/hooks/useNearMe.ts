'use client';

import { useEffect, useMemo, useState } from 'react';
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

/**
 * useNearMe — single near-me hook for discovery surfaces.
 *
 * Accepts user coords, an active flag, an open-now flag, and a radius. Calls
 * `searchFoodNearMe` once when active and coords are available, then applies
 * the open-now filter client-side so distance ordering is preserved.
 *
 */
export function useNearMe({
  coords,
  active,
  openNow,
  radiusKm,
  reviewStatus,
}: UseNearMeOptions): UseNearMeResult {
  const isActive = active && coords !== null;

  const [rawResults, setRawResults] = useState<NearMeFoodResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

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
  }, [isActive, coords?.lat, coords?.lon, radiusKm, reviewStatus, fetchKey]);

  const results = useMemo(() => filterOpenNow(rawResults, openNow), [rawResults, openNow]);

  const isLoading = isActive && (!hasFetched || isFetching);

  return {
    isActive,
    results,
    isLoading,
    error,
    refetch: () => setFetchKey((k) => k + 1),
  };
}
