'use client';
// React imports
import { Suspense, useEffect, useState, useRef } from 'react';

import { useSearchParams, usePathname } from 'next/navigation';

// Third-party imports
import { ChevronDown, Search, X, Loader2 } from 'lucide-react';
// Local imports
import { useSearch, LOCATION_ALL } from '@/providers/search-provider';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/providers/LanguageProvider';

import { logSupabaseError } from '@/utils/errorUtils';

interface SearchBarProps {
  className?: string;
  // Custom cities to use instead of fetching from database
  customCities?: string[];
  // Callbacks for parent to handle behavior
  onSearchSubmit?: (query: string, location: string) => void;
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
  const { t } = useLanguage();
  // State for input and dropdowns
  const [isTyping, setIsTyping] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const {
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    selectedSection,
  } = useSearch();

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
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [hasMounted, setHasMounted] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; type: 'provider' | 'menuItem' | 'cuisine' }>>([]);
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
      if (
        werDropdownRef.current &&
        !werDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWerOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
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
          // Otherwise, fetch all cities
          const allCities = await fetchProviderCities();
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
  }, [searchQuery, customCities, t]);

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
        // Search providers (restaurant names), food_menu items, and categories directly
        const [providerRes, menuRes, categoryRes] = await Promise.all([
          supabase.from('providers').select('provider_name').ilike('provider_name', `%${query}%`).limit(5),
          supabase.from('food_menu').select('name_de, name_en').ilike('name_de', `%${query}%`).limit(5),
          supabase.from('categories').select('name_de, name_en').ilike('name_de', `%${query}%`).limit(5),
        ]);

        if (cancelled) return;

        const providerNames: Array<{ label: string; type: 'provider' }> = (providerRes.data || [])
          .map((p) => ({ label: p.provider_name, type: 'provider' as const }))
          .filter((p) => p.label);

        const menuItems: Array<{ label: string; type: 'menuItem' }> = (menuRes.data || [])
          .map((m) => ({ label: m.name_de || m.name_en || '', type: 'menuItem' as const }))
          .filter((m) => m.label);

        const categories: Array<{ label: string; type: 'cuisine' }> = (categoryRes.data || [])
          .map((c) => ({ label: c.name_de || c.name_en || '', type: 'cuisine' as const }))
          .filter((c) => c.label);

        const combined: Array<{ label: string; type: 'provider' | 'menuItem' | 'cuisine' }> = [
          ...providerNames,
          ...menuItems,
          ...categories,
        ];

        // Deduplicate by label
        const seen = new Set<string>();
        const deduped = combined.filter((item) => {
          if (seen.has(item.label)) return false;
          seen.add(item.label);
          return true;
        });

        setSuggestions(deduped.slice(0, 10));
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

  // Handle search submission
  const handleSearch = () => {
    // Call parent callback to handle the search
    onSearchSubmit?.(searchQuery, selectedLocation);
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
      {/* Primary bar: Location + Search + Submit button */}
      <div className="relative flex h-12 w-full flex-row items-center gap-3 rounded-2xl bg-white border border-border-light px-3">
        <div suppressHydrationWarning className="flex w-full flex-row items-center gap-3">
          {/* Location — Where first */}
          <div className="relative flex flex-row items-center">
            <button
              aria-expanded={isLocationOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLocationOpen(!isLocationOpen);
              }}
            >
              <span className="text-sm font-medium text-neutral-600 max-w-[120px] truncate sm:max-w-none">
                {t('suchen.wo.selectedWhere', { city: selectedLocation === LOCATION_ALL ? t('search.everywhere') : selectedLocation })}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`size-5 text-neutral-500 transition-transform duration-200 ${
                  isLocationOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isLocationOpen && (
              <div
                ref={locationDropdownRef}
                className="dropdown-container absolute right-0 top-full z-50 mt-1 w-48 max-h-64 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                {/* "Everywhere" option using canonical sentinel */}
                <button
                  key="__everywhere__"
                  className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                    selectedLocation === LOCATION_ALL ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedLocation(LOCATION_ALL);
                    setIsLocationOpen(false);
                    onLocationChange?.(LOCATION_ALL);
                  }}
                >
                  {t('search.everywhere')}
                </button>
                {/* City options */}
                {locations.map((location) => (
                  <button
                    key={location}
                    className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                      location === selectedLocation ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => {
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

          {/* Search Section — What second */}
          <div className="relative flex flex-1 flex-row items-center gap-1">
            <Search className="text-neutral-500 shrink-0" size={20} />
            <input
              ref={inputRef}
              className={`w-full appearance-none truncate border-none bg-transparent px-1 text-base font-normal leading-[19px] outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0 ${isTyping ? 'text-content' : 'text-gray-400'}`}
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
                  // Call parent callback to handle clear
                  onClearSearch?.();
                }}
              >
                <X className="text-gray-400" size={16} />
              </button>
            )}
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
                className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 max-h-80 overflow-y-auto"
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
                    <span className="text-xs font-medium uppercase text-gray-400 w-14 shrink-0">
                      {item.type === 'provider' ? t('search.suggestions.provider') :
                       item.type === 'cuisine' ? t('search.suggestions.cuisine') : t('search.suggestions.menuItem')}
                    </span>
                    <span className="text-gray-800">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button — CTA */}
          <button
            className="shrink-0 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            type="button"
            onClick={() => onSearchSubmit?.(searchQuery, selectedLocation)}
          >
            {t('search.searchButton')}
          </button>
        </div>
      </div>

      {/* Secondary filter pills — desktop only */}
      <div className="hidden md:flex flex-row items-center gap-2">
        {/* Wer pill */}
        <div className="relative flex flex-row items-center">
          <button
            aria-expanded={isWerOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1 rounded-full bg-white border border-border-light px-3 py-1.5 hover:bg-gray-50 transition-colors"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsWerOpen(!isWerOpen);
              if (!isWerOpen) {
                setIsLocationOpen(false);
              }
            }}
          >
            <span className="text-sm font-medium text-neutral-600">
              {t('suchen.accordions.wer')}: {selectedWer === 1 ? t('search.personSingular', { count: 1 }) : t('search.personPlural', { count: selectedWer })}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`size-4 text-neutral-500 transition-transform duration-200 ${
                isWerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isWerOpen && (
            <div
              ref={werDropdownRef}
              className="dropdown-container absolute left-0 top-full z-50 mt-1 w-48 max-h-64 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  className={`block w-full px-4 py-2 text-left text-base hover:bg-gray-50 ${
                    selectedWer === count ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedWer(count);
                    setIsWerOpen(false);
                    setIsLocationOpen(false);
                  }}
                >
                  {count === 1 ? t('search.personSingular', { count: 1 }) : t('search.personPlural', { count })}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter pill */}
        <div className="relative flex flex-row items-center">
          <button
            aria-expanded={isFilterOpen}
            aria-haspopup="listbox"
            className="flex items-center gap-1 rounded-full bg-white border border-border-light px-3 py-1.5 hover:bg-gray-50 transition-colors"
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
            <span className="text-sm font-medium text-neutral-600">
              {selectedFilters.length > 0
                ? `${t('suchen.accordions.filter')}: ${selectedFilters.length}`
                : t('suchen.accordions.filter')}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`size-4 text-neutral-500 transition-transform duration-200 ${
                isFilterOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isFilterOpen && (
            <div
              ref={filterDropdownRef}
              className="dropdown-container absolute left-0 top-full z-50 mt-1 w-56 max-h-80 overflow-y-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              {(selectedSection === 'ummah'
                ? [
                    { key: 'kostenlos', labelKey: 'suchen.filter.ummahItems.kostenlos.title' },
                    { key: 'online', labelKey: 'suchen.filter.ummahItems.online.title' },
                    { key: 'sprache', labelKey: 'suchen.filter.ummahItems.sprache.title' },
                    { key: 'zertifiziert', labelKey: 'suchen.filter.ummahItems.zertifiziert.title' },
                    { key: 'geschlechtergetrennt', labelKey: 'suchen.filter.ummahItems.geschlechtergetrennt.title' },
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
                      setSelectedFilters((prev) =>
                        prev.includes(item.key)
                          ? prev.filter((f) => f !== item.key)
                          : [...prev, item.key]
                      );
                    }}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg fill="none" height="10" viewBox="0 0 10 10" width="10">
                          <path d="M2 5L4 7L8 3" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/>
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
    </div>
  );
}

export function SearchBar(props: SearchBarProps) {
  return (
    <Suspense
      fallback={
        <div
          className={`flex h-12 w-full flex-row items-center gap-4 rounded-2xl bg-white border border-border-light px-2 ${props.className} `}
        >
          <div className="flex w-full flex-row items-center justify-between">
            <div className="relative flex flex-1 flex-row items-center gap-0">
        <Search className="text-neutral-500" size={24} />
              <input
                disabled
                className="w-full appearance-none border-none bg-transparent text-base font-normal leading-[19px] text-gray-400 outline-none ring-0 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                placeholder="Search in your Ummah"
                type="text"
              />
            </div>
          </div>
        </div>
      }
    >
      <SearchBarContent {...props} />
    </Suspense>
  );
}

SearchBar.displayName = 'SearchBar';
