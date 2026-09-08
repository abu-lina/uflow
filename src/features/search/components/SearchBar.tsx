'use client';
// React imports
import { Suspense, useCallback, useEffect, useState, useRef } from 'react';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search, X, Loader2, MapPin, Clock, Globe } from 'lucide-react';
// Local imports
import { useSearch, LOCATION_ALL } from '@/providers/search-provider';
import { fetchSearchSuggestions } from '@/services/providers';
import { useLanguage } from '@/providers/LanguageProvider';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getNearMePermissionHintKey } from '@/features/search/utils/nearMePermissionHint';

import { logSupabaseError } from '@/utils/errorUtils';

interface SearchBarProps {
  className?: string;
  // Custom cities to use instead of fetching from database
  customCities?: string[];
  // Callbacks for parent to handle behavior
  onSearchSubmit?: (query: string, location: string, filters?: string[]) => void;
  onClearSearch?: () => void;
  onLocationChange?: (location: string) => void;
}

function SearchBarContent({
  className = '',
  customCities,
  onSearchSubmit,
  onClearSearch,
  onLocationChange,
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
  const werDropdownRef = useRef<HTMLDivElement>(null);
  const [isWerOpen, setIsWerOpen] = useState(false);
  const [selectedWer, setSelectedWer] = useState(1);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() => {
    const p = new URLSearchParams(searchParams.toString());
    return p.get('filters')?.split(',').filter(Boolean) ?? [];
  });
  const [hasMounted, setHasMounted] = useState(false);
  // Initialize near-me and open-now from URL params (same pattern as useNearMeToggle)
  const [nearMeActive, setNearMeActive] = useState(() => {
    const p = new URLSearchParams(searchParams.toString());
    return p.has('near_lat') && p.has('near_lon');
  });
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
      if (werDropdownRef.current && !werDropdownRef.current.contains(event.target as Node)) {
        setIsWerOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }

    // Add event listener if any dropdown is open
    if (isLocationOpen || isWerOpen || isFilterOpen || suggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLocationOpen, isWerOpen, isFilterOpen, suggestions.length]);

  // Fetch cities based on current filters
  useEffect(() => {
    let cancelled = false;

    async function fetchCities() {
      try {
        // If custom cities are provided, use them instead of fetching from database
        if (customCities) {
          if (!cancelled) setLocations(customCities);
          return;
        }

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
      } catch (error) {
        logSupabaseError('SearchBar.fetchCities', error);
        // Set fallback to empty array, so the UI still works (just "Everywhere" option)
        if (!cancelled) setLocations([]);

        // Don't re-throw - we've handled it gracefully
        // The error is already logged by logSupabaseError
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            'Failed to fetch cities. Using fallback. ' +
              'This is usually a network or configuration issue. ' +
              'Check your .env.local and restart the dev server.',
          );
        }
      }
    }

    void fetchCities();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, customCities, selectedSection, t]);

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

  // ── URL sync helper (mirrors useNearMeToggle.syncUrl) ───────────────
  const syncUrl = useCallback(
    (overrides: { active?: boolean; openNow?: boolean; lat?: number; lon?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const active = overrides.active ?? nearMeActive;
      const openNow = overrides.openNow ?? openNowActive;
      const lat = overrides.lat ?? geolocation.coords?.latitude;
      const lon = overrides.lon ?? geolocation.coords?.longitude;

      if (active && lat != null && lon != null) {
        params.set('near_lat', String(lat));
        params.set('near_lon', String(lon));
        params.set('near_radius', '5');
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

      router.push(`/providers?${params.toString()}`);
    },
    [searchParams, nearMeActive, openNowActive, geolocation.coords, router],
  );

  // When geolocation transitions to granted while near-me is active, sync coords to URL.
  useEffect(() => {
    if (nearMeActive && geolocation.status === 'granted' && geolocation.coords) {
      syncUrl({
        active: true,
        lat: geolocation.coords.latitude,
        lon: geolocation.coords.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearMeActive, geolocation.status, geolocation.coords]);

  // ── Near Me handler (selected from location dropdown) ──────────────
  const handleSelectNearMe = useCallback(() => {
    setNearMeActive(true);
    setSelectedLocation(LOCATION_ALL);
    setIsLocationOpen(false);
    if (geolocation.status === 'idle') {
      geolocation.requestLocation();
    } else if (geolocation.status === 'granted' && geolocation.coords) {
      syncUrl({ active: true });
    }
  }, [geolocation, syncUrl, setSelectedLocation]);

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
    onSearchSubmit?.(searchQuery, selectedLocation, filters.length > 0 ? filters : undefined);
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

          {/* Wer chip */}
          <div className="relative flex items-center">
            <button
              aria-expanded={isWerOpen}
              aria-haspopup="listbox"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
                selectedWer > 1
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
              }`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsWerOpen(!isWerOpen);
                if (!isWerOpen) {
                  setIsLocationOpen(false);
                }
              }}
            >
              <span>
                {t('suchen.accordions.wer')}:{' '}
                {selectedWer === 1
                  ? t('search.personSingular', { count: 1 })
                  : t('search.personPlural', { count: selectedWer })}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  isWerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isWerOpen && (
              <div
                ref={werDropdownRef}
                className="dropdown-container absolute left-0 top-full z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      selectedWer === count ? 'bg-gray-50' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      setSelectedWer(count);
                      setIsWerOpen(false);
                      setIsLocationOpen(false);
                    }}
                  >
                    {count === 1
                      ? t('search.personSingular', { count: 1 })
                      : t('search.personPlural', { count })}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter chip */}
          <div className="relative flex items-center">
            <button
              aria-expanded={isFilterOpen}
              aria-haspopup="listbox"
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
                selectedFilters.length > 0
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
              }`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterOpen(!isFilterOpen);
                if (!isFilterOpen) {
                  setIsLocationOpen(false);
                  setIsWerOpen(false);
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
            {isFilterOpen && (
              <div
                ref={filterDropdownRef}
                className="dropdown-container absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {(selectedSection === 'ummah'
                  ? [
                      { key: 'kostenlos', labelKey: 'suchen.filter.ummahItems.kostenlos.title' },
                      { key: 'online', labelKey: 'suchen.filter.ummahItems.online.title' },
                      { key: 'sprache', labelKey: 'suchen.filter.ummahItems.sprache.title' },
                      {
                        key: 'zertifiziert',
                        labelKey: 'suchen.filter.ummahItems.zertifiziert.title',
                      },
                      {
                        key: 'geschlechtergetrennt',
                        labelKey: 'suchen.filter.ummahItems.geschlechtergetrennt.title',
                      },
                    ]
                  : selectedSection === 'store'
                    ? [
                        { key: 'spenden', labelKey: 'suchen.filter.items.spenden.title' },
                        { key: 'solidaritaet', labelKey: 'suchen.filter.items.solidaritaet.title' },
                        { key: 'parken', labelKey: 'suchen.filter.items.parken.title' },
                        { key: 'gebet', labelKey: 'suchen.filter.items.gebet.title' },
                      ]
                    : [
                        { key: 'muslim', labelKey: 'suchen.filter.items.muslim.title' },
                        { key: 'spenden', labelKey: 'suchen.filter.items.spenden.title' },
                        { key: 'solidaritaet', labelKey: 'suchen.filter.items.solidaritaet.title' },
                        { key: 'parken', labelKey: 'suchen.filter.items.parken.title' },
                        { key: 'gebet', labelKey: 'suchen.filter.items.gebet.title' },
                      ]
                ).map((item) => {
                  const isSelected = selectedFilters.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-base hover:bg-gray-50 ${
                        isSelected ? 'bg-gray-50 font-medium' : ''
                      }`}
                      type="button"
                      onClick={() => {
                        const next = selectedFilters.includes(item.key)
                          ? selectedFilters.filter((f) => f !== item.key)
                          : [...selectedFilters, item.key];
                        setSelectedFilters(next);
                        // Propagate filter change to URL immediately
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
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
