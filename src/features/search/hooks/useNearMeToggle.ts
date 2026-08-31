'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGeolocation, type GeolocationStatus } from '@/hooks/useGeolocation';

interface RouterLike {
  replace: (url: string, options?: { scroll?: boolean }) => void;
}

interface SearchParamsLike {
  toString(): string;
}

export interface UseNearMeToggleResult {
  geoStatus: GeolocationStatus;
  nearMeActive: boolean;
  openNowActive: boolean;
  radiusKm: number;
  onToggleNearMe: () => void;
  onToggleOpenNow: () => void;
  onRadiusChange: (km: number) => void;
}

/**
 * useNearMeToggle — owns "Near me" + "Open now" chip state on the SEARCH
 * RESULTS page (Plan 196, corrected placement) and syncs it into the URL
 * via `router.replace` (no navigation, no page reload) so the existing
 * `useNearMeSearch` hook (which reads `near_lat`/`near_lon`/`near_radius`/
 * `open_now` from the URL) picks up changes reactively.
 *
 * Always builds the next URL from the CURRENT search params (never an empty
 * `URLSearchParams()`), preserving persistent state like `section`/`q`/
 * `category` — see Search/Filter Client-Interaction Trace requirement.
 */
export function useNearMeToggle(
  router: RouterLike,
  searchParams: SearchParamsLike,
  pathname: string,
): UseNearMeToggleResult {
  const geolocation = useGeolocation();
  // Hydrate initial chip state from the URL so a direct link or page refresh
  // with near_lat/near_lon/open_now already present renders the chips as active.
  const [nearMeActive, setNearMeActive] = useState(() => {
    const initial = new URLSearchParams(searchParams.toString());
    return initial.has('near_lat') && initial.has('near_lon');
  });
  const [openNowActive, setOpenNowActive] = useState(
    () => new URLSearchParams(searchParams.toString()).get('open_now') === '1',
  );
  const [radiusKm, setRadiusKmState] = useState(() => {
    const initial = Number(new URLSearchParams(searchParams.toString()).get('near_radius'));
    return initial > 0 ? initial : 5;
  });

  const syncUrl = useCallback(
    (overrides: {
      active?: boolean;
      radius?: number;
      openNow?: boolean;
      lat?: number;
      lon?: number;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const active = overrides.active ?? nearMeActive;
      const radius = overrides.radius ?? radiusKm;
      const openNow = overrides.openNow ?? openNowActive;
      const lat = overrides.lat ?? geolocation.coords?.latitude;
      const lon = overrides.lon ?? geolocation.coords?.longitude;

      if (active && lat != null && lon != null) {
        params.set('near_lat', String(lat));
        params.set('near_lon', String(lon));
        params.set('near_radius', String(radius));
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

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, nearMeActive, radiusKm, openNowActive, geolocation.coords, router, pathname],
  );

  const onToggleNearMe = useCallback(() => {
    if (!nearMeActive) {
      setNearMeActive(true);
      if (geolocation.status === 'idle') {
        geolocation.requestLocation();
      } else if (geolocation.status === 'granted' && geolocation.coords) {
        syncUrl({ active: true });
      }
    } else {
      setNearMeActive(false);
      syncUrl({ active: false });
    }
  }, [nearMeActive, geolocation, syncUrl]);

  const onToggleOpenNow = useCallback(() => {
    const next = !openNowActive;
    setOpenNowActive(next);
    syncUrl({ openNow: next });
  }, [openNowActive, syncUrl]);

  const onRadiusChange = useCallback(
    (km: number) => {
      setRadiusKmState(km);
      syncUrl({ radius: km });
    },
    [syncUrl],
  );

  // When geolocation transitions to granted while "near me" is active
  // (e.g. right after requestLocation() resolves), sync the URL with coords.
  useEffect(() => {
    if (nearMeActive && geolocation.status === 'granted' && geolocation.coords) {
      syncUrl({
        active: true,
        lat: geolocation.coords.latitude,
        lon: geolocation.coords.longitude,
      });
    }
  }, [geolocation.status, geolocation.coords]);

  return {
    geoStatus: geolocation.status,
    nearMeActive,
    openNowActive,
    radiusKm,
    onToggleNearMe,
    onToggleOpenNow,
    onRadiusChange,
  };
}
