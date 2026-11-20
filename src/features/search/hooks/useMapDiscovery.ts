'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMapLocations } from '@/services/providers';
import type { RawLocationRow } from '@/services/providers';
import type { Section } from '@/config/sectionFilters';
import type { SearchFilterKey } from '@/features/search/constants/filterKeys';
import type { HalalTier } from '@/features/search/discoveryQuery';
import { filterOpenNow } from '@/utils/filterOpenNow';
import type { MapPin } from '@/features/search/components/SearchMap';
import { buildViewToggleLink } from '@/features/search/discoveryQuery';
import type { GeolocationCoords } from '@/hooks/useGeolocation';

// Re-export row types for existing consumers
export type { RawCategoryRow, RawProviderRow, RawLocationRow } from '@/services/providers';

// ---- View mode ----

export type ViewMode = 'map' | 'list';

// ---- URL sync ----

/**
 * Optional URL-sync configuration. When provided, the hook writes the
 * view mode back via `replace()`. All existing query params are preserved.
 */
export interface UrlSyncConfig {
  searchParams: URLSearchParams | { get(key: string): string | null; toString(): string };
  pathname: string;
  replace: (url: string, options?: { scroll?: boolean }) => void;
}

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
    listing_type: p?.listing_type ?? undefined,
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
  hasOpenedMap: boolean;
  headerRef: React.RefObject<HTMLElement>;
  headerHeight: number;
  setHeaderHeight: React.Dispatch<React.SetStateAction<number>>;
  userCoords: { lat: number; lon: number } | null;
}

/**
 * useMapDiscovery — shared hook for map pin loading, view-mode state,
 * and open-now filtering. Consumed by ProvidersContent, the single
 * discovery surface for every section route (#674).
 *
 * @param reviewStatus - Optional review status filter for admin users.
 *   Defaults to 'approved' when null/undefined.
 * @param urlSync - Optional URL-sync config. When provided the hook
 *   reads `?view=` on mount and writes it back on toggle/set.
 * @param options - Section, optional city and filter scope for the pin query.
 *   deferPinsUntilMapOpened skips fetching until the map is opened once.
 */
export function useMapDiscovery(
  geolocation: { status: string; coords: GeolocationCoords | null },
  defaultViewMode: ViewMode = 'list',
  reviewStatus?: string | null,
  urlSync?: UrlSyncConfig,
  options?: {
    deferPinsUntilMapOpened?: boolean;
    section?: Section;
    city?: string | null;
    filters?: SearchFilterKey[];
    tier?: HalalTier;
    openNow?: boolean;
    view?: string | null;
  },
): UseMapDiscoveryResult {
  const [isOpenNow, setIsOpenNow] = useState(() => options?.openNow ?? false);

  // Sync isOpenNow when the caller's value changes (e.g. desktop header chip toggle)
  const urlOpenNow = options?.openNow ?? false;
  useEffect(() => {
    setIsOpenNow(urlOpenNow);
  }, [urlOpenNow]);

  // Resolve initial view: caller value > defaultViewMode
  const urlView = options?.view;
  const initialView: ViewMode =
    urlView === 'map' ? 'map' : urlView === 'list' ? 'list' : defaultViewMode;

  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const deferPins = options?.deferPinsUntilMapOpened ?? false;
  const section = options?.section;
  const city = options?.city;
  // Joined to a string so a new array with the same keys doesn't refetch.
  const filterKey = options?.filters?.join(',') ?? '';
  const tier = options?.tier;
  const [hasOpenedMap, setHasOpenedMap] = useState(initialView === 'map');
  const [allRows, setAllRows] = useState<RawLocationRow[]>([]);
  const [pinsLoading, setPinsLoading] = useState(!deferPins);
  const [pinsError, setPinsError] = useState<Error | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);

  // Stable ref to latest urlSync to avoid re-creating callbacks on every render
  const urlSyncRef = useRef(urlSync);
  urlSyncRef.current = urlSync;

  // Stable ref for defaultViewMode so buildViewUrl stays referentially stable
  const defaultViewRef = useRef(defaultViewMode);
  defaultViewRef.current = defaultViewMode;

  // Keep headerHeight in sync with the actual element size so content
  // is never hidden behind the fixed header (fixes /food overlap).
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setHeaderHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const userCoords = useMemo(
    () =>
      geolocation.status === 'granted' && geolocation.coords
        ? { lat: geolocation.coords.latitude, lon: geolocation.coords.longitude }
        : null,
    [geolocation.status, geolocation.coords],
  );

  const buildViewUrl = useCallback((nextView: ViewMode) => {
    const sync = urlSyncRef.current;
    if (!sync) return null;
    const currentUrl = sync.searchParams.toString()
      ? `${sync.pathname}?${sync.searchParams.toString()}`
      : sync.pathname;
    return buildViewToggleLink(currentUrl, nextView, defaultViewRef.current);
  }, []);

  // Sync the URL after a view change commits; replace() inside a setState
  // updater would update the Router during render (#992).
  const syncedViewRef = useRef(viewMode);
  useEffect(() => {
    if (viewMode === syncedViewRef.current) return;
    syncedViewRef.current = viewMode;
    const url = buildViewUrl(viewMode);
    if (url) urlSyncRef.current?.replace(url, { scroll: false });
  }, [viewMode, buildViewUrl]);

  const toggleViewMode = useCallback(() => {
    if (viewMode === 'map') {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 120);
    }
    setViewMode((v) => (v === 'map' ? 'list' : 'map'));
  }, [viewMode, setViewMode]);

  // Once the map view has been opened it stays "opened" so the map and
  // its pins are not torn down when toggling back to list.
  useEffect(() => {
    if (viewMode === 'map') setHasOpenedMap(true);
  }, [viewMode]);

  // Load map pins on mount and when reviewStatus changes. When the
  // consumer defers pins, skip until the map has been opened once.
  useEffect(() => {
    if (deferPins && !hasOpenedMap) return;
    // A slower earlier response (e.g. the previous tier) must not overwrite a newer one.
    let cancelled = false;
    const load = async () => {
      setPinsLoading(true);
      setPinsError(null);
      try {
        const filters = filterKey ? (filterKey.split(',') as SearchFilterKey[]) : undefined;
        const rows = await getMapLocations({ section, city, reviewStatus, filters, tier });
        if (!cancelled) setAllRows(rows);
      } catch (err) {
        if (!cancelled) setPinsError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setPinsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reviewStatus, deferPins, hasOpenedMap, section, city, filterKey, tier]);

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
    hasOpenedMap,
    headerRef,
    headerHeight,
    setHeaderHeight,
    userCoords,
  };
}
