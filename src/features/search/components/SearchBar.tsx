'use client';
// React imports
import { Suspense, useCallback, useEffect, useState, useRef } from 'react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search, X, Loader2, MapPin, Clock, Globe } from 'lucide-react';
// Local imports
import { useSearch, LOCATION_ALL } from '@/providers/search-provider';
import { fetchSearchSuggestions, fetchAvailableFilters } from '@/services/providers';
import { useLanguage } from '@/providers/LanguageProvider';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getNearMePermissionHintKey } from '@/features/search/utils/nearMePermissionHint';
import { getResultsPathForSection } from '@/config/sectionFilters';

import { logSupabaseError } from '@/utils/errorUtils';

interface SearchBarProps {
  className?: string;
  // Custom cities to use instead of fetching from database
  customCities?: string[];
  // Callbacks for parent to handle behavior
  onSearchSubmit?: (query: string, location: string, filters?: string[]) => void;
  onClearSearch?: () => void;
  onLocationChange?: (location: string) => void;
  /** Optional admin-only content rendered inline with the desktop filter chips. */
  adminSlot?: React.ReactNode;
}

function SearchBarContent({
  className = '',
  customCities,
  onSearchSubmit,
  onClearSearch,
  onLocationChange,
  adminSlot,
}: SearchBarProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const geolocation = useGeolocation();
  // State for input and dropdowns
  const [isTyping, setIsTyping] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const { searchQuery, setSearchQuery, selectedLocation, setSelectedLocation, selectedSection } =
    useSearch();

  // Locations array stores actual city names; LOCATION_ALL is added in the dropdown as first option
  const [locations, setLocations] = useState<string[]>([]);
  const hasSyncedFromUrl = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  // Available filter keys fetched from DB, with counts per city/section
  const [availableFilters, setAvailableFilters] = useState<{ key: string; count: number }[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
    const p = new URLSearchParams(searchParams.toString());
    return p.get('filters')?.split(',').filter(Boolean) ?? [];
  });
  const [hasMounted, setHasMounted] = useState(false);
  // Initialize near-me and open-now from URL params
  const [nearMeActive, setNearMeActive] = useState(
    () => new URLSearchParams(searchParams.toString()).get('near_me') === '1',
  );
  const [openNowActive, setOpenNowActive] = useState(
    () => new URLSearchParams(searchParams.toString()).get('open_now') === '1',
  );

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; type: 'provider' | 'menuItem' | 'cuisine' }>
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Handle clicks outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if clicking on the button itself
      const target = event.target as HTMLElement;
      const isButtonClick = target.closest('button[aria-expanded]');

      if (isButtonClick) {
        return;
      }

      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocationOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }

    // Add event listener if any dropdown is open
    if (isLocationOpen || isFilterOpen || suggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocationOpen, isFilterOpen, suggestions.length]);

  // Fetch cities based on current filters
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        // If custom cities are provided, use them instead of fetching from database
        if (customCities) {
          if (!cancelled) setLocations(customCities);
        } else {
          // Use dynamic import to avoid module initialization issues
          const { fetchProviderCities, fetchFilteredCities } = await import('@/services/providers');

          // If we have search query filters, use filtered cities
          if (searchQuery.trim()) {
            const filteredCities = await fetchFilteredCities('', searchQuery);
            if (!cancelled) setLocations(filteredCities);
          } else {
            // Fetch cities scoped to the active section (e.g. only food cities on /food)
            const allCities = await fetchProviderCities(selectedSection);
            if (!cancelled) setLocations(allCities);
          }
        }

        // Fetch which filters have actual data for the current section + city
        const cityParam = selectedLocation || undefined;
        const filters = await fetchAvailableFilters(selectedSection, cityParam);
        if (!cancelled) {
          setAvailableFilters(filters);
          // Prune selected filters that now have 0 matches in the new city.
          // Only cleans local state; the URL is already updated by the city
          // change handler, so no navigation call is needed here.
          const activeKeys = new Set<string>(filters.filter((f) => f.count > 0).map((f) => f.key));
          setSelectedFilters((prev) => prev.filter((k) => activeKeys.has(k)));
        }
      } catch (error) {
        logSupabaseError('SearchBar.fetchData', error);
        if (!cancelled) {
          setLocations([]);
          setAvailableFilters([]);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, customCities, selectedSection, selectedLocation, t]);

  // Sync state with URL params only on initial mount or when the page changes
  useEffect(() => {
    if (!hasSyncedFromUrl.current) {
      const q = searchParams.get('q') || '';
      // Map legacy translated values ("Überall", "Everywhere") to canonical sentinel
      const locationParam = searchParams.get('location') || '';
      const isAllLocations =
        !locationParam || locationParam === 'Überall' || locationParam === 'Everywhere';
      const location = isAllLocations ? LOCATION_ALL : locationParam;
      setSearchQuery(q);
      setSelectedLocation(location);
      hasSyncedFromUrl.current = true;
    }
  }, [pathname, searchParams, setSearchQuery, setSelectedLocation, t]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const results = await fetchSearchSuggestions(query);
        if (!cancelled) setSuggestions(results);
      } catch (err) {
        console.debug('[SearchBar] Suggestions error:', err);
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  // ── URL sync helper for open-now / near-me params ────────────────
  // Near-me navigates to the section root (e.g. /food) since having a city
  // in the path conflicts with geolocation-based results.
  const syncUrl = useCallback(
    (overrides: { active?: boolean; openNow?: boolean }) => {
      const active = overrides.active ?? nearMeActive;
      const openNow = overrides.openNow ?? openNowActive;

      // When near-me is active, navigate to section root (strip city from path)
      const basePath = active ? getResultsPathForSection(selectedSection) : pathname;

      const params = new URLSearchParams(searchParams.toString());

      if (active) {
        params.set('near_me', '1');
      } else {
        params.delete('near_me');
      }

      if (openNow) {
        params.set('open_now', '1');
      } else {
        params.delete('open_now');
      }

      // Clean up stale near params
      params.delete('near_lat');
      params.delete('near_lon');
      params.delete('near_radius');

      router.push(`${basePath}?${params.toString()}`);
    },
    [searchParams, nearMeActive, openNowActive, router, pathname, selectedSection],
  );

  // ── Near Me handler (selected from location dropdown) ──────────────
  // Navigates to /food?near_me=1 — ProvidersContent reads the param and
  // triggers its own geolocation request + near-me results.
  const handleSelectNearMe = useCallback(() => {
    setNearMeActive(true);
    setSelectedLocation(LOCATION_ALL);
    setIsLocationOpen(false);
    syncUrl({ active: true });
  }, [syncUrl, setSelectedLocation]);

  // Deactivate near-me when a city or "Everywhere" is picked.
  // Only resets local state + geolocation; does NOT navigate.
  // The caller (onLocationChange / onSearchSubmit) handles navigation
  // so we avoid two competing router.push calls.
  const deactivateNearMe = useCallback(() => {
    if (nearMeActive) {
      setNearMeActive(false);
      geolocation.reset();
    }
  }, [nearMeActive, geolocation]);

  // ── Open Now handler ───────────────────────────────────────────────
  const handleToggleOpenNow = useCallback(() => {
    const next = !openNowActive;
    setOpenNowActive(next);
    syncUrl({ openNow: next });
  }, [openNowActive, syncUrl]);

  // Geo status helpers for hint display
  const geoStatus = geolocation.status;
  const showPermissionDenied =
    nearMeActive &&
    (geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout');
  const showPermissionDeniedHint = nearMeActive && geoStatus === 'denied';
  // Chip is "active" when location is granted, or when near-me is on while geo is still idle
  const nearMeChipActive = nearMeActive && (geoStatus === 'granted' || geoStatus === 'idle');

  // Handle search submission
  const handleSearch = (overrideFilters?: string[]) => {
    const filters = overrideFilters ?? selectedFilters;
    // Call parent callback to handle the search
    onSearchSubmit?.(searchQuery, selectedLocation, filters);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
      setSuggestions([]);
    }
  };

  return (
    <div
      aria-label={t('search.ariaLabel')}
      className={`flex flex-col gap-2 ${className}`}
      role="search"
    >
      {/* Primary bar: Input + Clear + Search icon button */}
      <div className="relative flex h-12 w-full items-center gap-0 rounded-xl border border-gray-200 bg-white px-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
        <div suppressHydrationWarning className="relative flex w-full items-center gap-1">
          <input
            ref={inputRef}
            className={`min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm font-normal shadow-none outline-none ring-0 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0 ${isTyping ? 'text-gray-800' : 'text-gray-400'}`}
            placeholder={t('search.placeholder')}
            type="text"
            value={searchQuery}
            onBlur={() => setIsTyping(false)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsTyping(true);
            }}
            onFocus={() => setIsTyping(true)}
            onKeyDown={handleKeyPress}
          />
          {hasMounted && searchQuery && (
            <button
              aria-label={t('common.delete')}
              className="shrink-0 rounded p-1 hover:bg-gray-100 focus:outline-none"
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
                onClearSearch?.();
              }}
            >
              <X className="text-gray-400" size={16} />
            </button>
          )}
          {/* Submit — Search icon button */}
          <button
            aria-label={t('search.submit')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-500 transition-opacity hover:opacity-70 active:opacity-50"
            type="button"
            onClick={() => {
              handleSearch();
              setSuggestions([]);
            }}
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </button>
          {/* Loading indicator for suggestions */}
          {isLoadingSuggestions && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full">
              <div className="flex items-center justify-center rounded-lg bg-white py-3 shadow-lg ring-1 ring-black/5">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          {/* Suggestions dropdown */}
          {searchQuery.trim().length >= 2 && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.label}-${idx}`}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery(item.label);
                    setSuggestions([]);
                    onSearchSubmit?.(item.label, selectedLocation);
                  }}
                >
                  <span className="w-14 shrink-0 text-xs font-medium uppercase text-gray-400">
                    {item.type === 'provider'
                      ? t('search.suggestions.provider')
                      : item.type === 'cuisine'
                        ? t('search.suggestions.cuisine')
                        : t('search.suggestions.menuItem')}
                  </span>
                  <span className="text-gray-800">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary filter chips — desktop only */}
      <div className="hidden flex-col gap-2 md:flex">
        <div className="flex flex-nowrap items-center gap-2">
          {/* City / Location + Near Me merged chip */}
          <div className="relative flex items-center">
            <button
              aria-expanded={isLocationOpen}
              aria-haspopup="listbox"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
                nearMeChipActive || selectedLocation !== LOCATION_ALL
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
              }`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLocationOpen(!isLocationOpen);
              }}
            >
              {nearMeActive && (
                <MapPin
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 shrink-0 ${geoStatus === 'prompting' ? 'animate-pulse' : ''}`}
                />
              )}
              <span className={geoStatus === 'prompting' && nearMeActive ? 'animate-pulse' : ''}>
                {nearMeActive
                  ? t('suchen.nearMe.chipLabel')
                  : selectedLocation === LOCATION_ALL
                    ? t('search.everywhere')
                    : selectedLocation}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  isLocationOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isLocationOpen && (
              <div
                ref={locationDropdownRef}
                className="dropdown-container absolute left-0 top-full z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {/* "Near Me" option — top of dropdown */}
                <button
                  key="__near_me__"
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-base hover:bg-gray-50 ${
                    nearMeActive ? 'bg-gray-50 font-medium' : ''
                  }`}
                  type="button"
                  onClick={handleSelectNearMe}
                >
                  <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {t('suchen.nearMe.chipLabel')}
                </button>
                {/* "Everywhere" option using canonical sentinel */}
                <button
                  key="__everywhere__"
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-base hover:bg-gray-50 ${
                    !nearMeActive && selectedLocation === LOCATION_ALL ? 'bg-gray-50' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    deactivateNearMe();
                    setSelectedLocation(LOCATION_ALL);
                    setIsLocationOpen(false);
                    onLocationChange?.(LOCATION_ALL);
                  }}
                >
                  <Globe aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {t('search.everywhere')}
                </button>
                {/* City options */}
                {locations.map((location) => (
                  <button
                    key={location}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      !nearMeActive && location === selectedLocation ? 'bg-gray-50' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      deactivateNearMe();
                      setSelectedLocation(location);
                      setIsLocationOpen(false);
                      onLocationChange?.(location);
                    }}
                  >
                    {location}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Open Now chip — syncs open_now param to URL */}
          <button
            aria-pressed={openNowActive}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
              openNowActive
                ? 'bg-primary text-white'
                : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
            }`}
            type="button"
            onClick={handleToggleOpenNow}
          >
            <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {t('suchen.openNow.chipLabel')}
          </button>

          {/* Filter chip (only shown when at least one filter has count > 0) */}
          {availableFilters.some((f) => f.count > 0) && (
            <div className="relative flex items-center">
              <div className="inline-flex items-center">
                <button
                  aria-expanded={isFilterOpen}
                  aria-haspopup="listbox"
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
                    selectedFilters.length > 0
                      ? 'rounded-l-md bg-primary pl-3 pr-1.5 text-white'
                      : 'rounded-md border border-gray-200 bg-white px-3 text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
                  }`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFilterOpen(!isFilterOpen);
                    if (!isFilterOpen) {
                      setIsLocationOpen(false);
                    }
                  }}
                >
                  <span>
                    {selectedFilters.length > 0
                      ? `${t('suchen.accordions.filter')}: ${selectedFilters.length}`
                      : t('suchen.accordions.filter')}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      isFilterOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {selectedFilters.length > 0 && (
                  <button
                    aria-label={t('suchen.clearAll')}
                    className="inline-flex h-8 items-center rounded-r-md bg-primary pl-0.5 pr-2 text-white transition-opacity hover:opacity-80"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFilters([]);
                      handleSearch([]);
                    }}
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isFilterOpen && (
                <div
                  ref={filterDropdownRef}
                  className="dropdown-container absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
                >
                  {availableFilters
                    .filter((f) => f.count > 0)
                    .map((filter) => {
                      const isSelected = selectedFilters.includes(filter.key);
                      return (
                        <button
                          key={filter.key}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-base hover:bg-gray-50 ${isSelected ? 'bg-gray-50 font-medium' : ''}`}
                          type="button"
                          onClick={() => {
                            const next = selectedFilters.includes(filter.key)
                              ? selectedFilters.filter((f) => f !== filter.key)
                              : [...selectedFilters, filter.key];
                            setSelectedFilters(next);
                            handleSearch(next);
                          }}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg fill="none" height="10" viewBox="0 0 10 10" width="10">
                                <path
                                  d="M2 5L4 7L8 3"
                                  stroke="white"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                />
                              </svg>
                            )}
                          </span>
                          {t(`suchen.filter.items.${filter.key}.title`)} ({filter.count})
                        </button>
                      );
                    })}
                  {selectedFilters.length > 0 && (
                    <button
                      className="flex w-full items-center justify-center border-t border-gray-100 px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50"
                      type="button"
                      onClick={() => {
                        setSelectedFilters([]);
                        handleSearch([]);
                        setIsFilterOpen(false);
                      }}
                    >
                      {t('suchen.clearAll')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {adminSlot}
        </div>

        {/* Geo permission status / hint (below chips row) */}
        {showPermissionDenied ? (
          <p aria-live="polite" className="px-0.5 text-sm text-text-muted" role="status">
            <span className="block">{t('suchen.nearMe.permissionDenied')}</span>
            {showPermissionDeniedHint ? (
              <span className="block text-xs">{t(getNearMePermissionHintKey())}</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Suspense
      fallback={
        <div
          className={`flex h-12 w-full items-center gap-0 rounded-xl border border-gray-200 bg-white px-4 shadow-sm ${props.className} `}
        >
          <input
            disabled
            className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm font-normal text-gray-400 shadow-none outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            placeholder="Search in your Ummah"
            type="text"
          />
          <Search className="h-5 w-5 shrink-0 text-gray-500" />
        </div>
      }
    >
      <SearchBarContent {...props} />
    </Suspense>
  );
}

SearchBar.displayName = 'SearchBar';
