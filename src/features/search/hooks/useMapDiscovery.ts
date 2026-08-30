'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { filterOpenNow } from '@/utils/filterOpenNow';
import type { MapPin } from '@/features/search/components/SearchMap';
import type { OpeningHours } from '@/types/openingHours';
import type { GeolocationCoords } from '@/hooks/useGeolocation';

// ---- Supabase row shapes (shared between discovery surfaces) ----

export type RawCategoryRow = {
  name_de?: string | null;
  name_en?: string | null;
  category_images?: Record<string, unknown> | null;
};

export type RawProviderRow = {
  provider_name?: string | null;
  opening_hours?: OpeningHours | null;
  provider_images?: string | { urls?: string[] } | null;
  address_city?: string | null;
  category_id?: string | null;
  categories?: RawCategoryRow | RawCategoryRow[] | null;
};

export type RawLocationRow = {
  provider_id: string;
  location_latitude: number | null;
  location_longitude: number | null;
  providers: RawProviderRow | RawProviderRow[] | null;
};

// ---- View mode ----

export type ViewMode = 'map' | 'list';

// ---- Pin adapter ----

function toMapPin(row: RawLocationRow): MapPin | null {
  if (row.location_latitude === null || row.location_longitude === null) return null;
  const p = Array.isArray(row.providers) ? (row.providers[0] ?? null) : row.providers;
  const rawCat = p?.categories;
  const cat = rawCat ? (Array.isArray(rawCat) ? (rawCat[0] ?? null) : rawCat) : null;
  const name = Array.isArray(row.providers)
    ? (row.providers[0]?.provider_name ?? 'Provider')
    : (row.providers?.provider_name ?? 'Provider');
  return {
    providerId: row.provider_id,
    providerName: name,
    lat: Number(row.location_latitude),
    lng: Number(row.location_longitude),
    opening_hours: p?.opening_hours ?? null,
    provider_images: p?.provider_images ?? null,
    address_city: p?.address_city ?? null,
    category_id: p?.category_id ?? null,
    category: cat
      ? {
          name_de: cat.name_de ?? '',
          name_en: cat.name_en ?? undefined,
          category_images: cat.category_images ?? undefined,
        }
      : undefined,
  };
}

// ---- Hook return type ----

export interface UseMapDiscoveryResult {
  pins: MapPin[];
  pinsLoading: boolean;
  pinsError: Error | null;
  isOpenNow: boolean;
  setIsOpenNow: React.Dispatch<React.SetStateAction<boolean>>;
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  toggleViewMode: () => void;
  headerRef: React.RefObject<HTMLElement>;
  headerHeight: number;
  setHeaderHeight: React.Dispatch<React.SetStateAction<number>>;
  userCoords: { lat: number; lon: number } | null;
}

/**
 * useMapDiscovery — shared hook for map pin loading, view-mode state,
 * and open-now filtering. Consumed by both ProvidersContent and
 * RootPageContent to eliminate verbatim duplication.
 */
export function useMapDiscovery(
  geolocation: { status: string; coords: GeolocationCoords | null },
  defaultViewMode: ViewMode = 'list',
): UseMapDiscoveryResult {
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [allRows, setAllRows] = useState<RawLocationRow[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [pinsError, setPinsError] = useState<Error | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);

  const userCoords = useMemo(
    () =>
      geolocation.status === 'granted' && geolocation.coords
        ? { lat: geolocation.coords.latitude, lon: geolocation.coords.longitude }
        : null,
    [geolocation.status, geolocation.coords],
  );

  const toggleViewMode = () => {
    if (viewMode === 'map') {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 120);
    }
    setViewMode((v) => (v === 'map' ? 'list' : 'map'));
  };

  // Load all map pins once on mount
  useEffect(() => {
    const load = async () => {
      setPinsLoading(true);
      setPinsError(null);
      try {
        const { data, error } = await supabase
          .from('locations')
          .select(
            'provider_id, location_latitude, location_longitude, providers!inner(provider_name, listing_type, review_status, opening_hours, provider_images, address_city, category_id, categories(name_de, name_en, category_images))',
          )
          .not('location_latitude', 'is', null)
          .not('location_longitude', 'is', null)
          .eq('providers.listing_type', 'food')
          .eq('providers.review_status', 'approved');
        if (error) {
          setPinsError(new Error(error.message));
        } else if (Array.isArray(data)) {
          setAllRows(data as RawLocationRow[]);
        }
      } catch (err) {
        setPinsError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setPinsLoading(false);
      }
    };
    void load();
  }, []);

  // Compute map pins from allRows, filtering by open-now when active
  const pins = useMemo<MapPin[]>(() => {
    const unique = new Map<string, MapPin>();
    for (const row of allRows) {
      if (unique.has(row.provider_id)) continue;
      const pin = toMapPin(row);
      if (pin) unique.set(row.provider_id, pin);
    }
    return filterOpenNow(Array.from(unique.values()), isOpenNow);
  }, [allRows, isOpenNow]);

  return {
    pins,
    pinsLoading,
    pinsError,
    isOpenNow,
    setIsOpenNow,
    viewMode,
    setViewMode,
    toggleViewMode,
    headerRef,
    headerHeight,
    setHeaderHeight,
    userCoords,
  };
}
