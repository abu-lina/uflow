'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';
import { normalizeCountryNameForDisplay } from '@/utils/addressValidation';
import { getOnboardingState, setOnboardingState } from '@/lib/utils/onboarding-state';

interface CityData {
  id: string;
  city_name: string;
  country: string;
  is_unlocked: boolean;
  provider_count: number;
  interest_count: number;
}

interface CitiesResponse {
  data: CityData[] | null;
  error: { message: string } | null;
}

interface NominatimCityResult {
  place_id: number;
  display_name: string;
  name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

/**
 * City Selection — Client Component
 *
 * Shows the top 3 cities (Berlin, Frankfurt, Stuttgart) with an inline
 * search for any global city via Nominatim. Fetches data server-side
 * via initialCities prop; React Query handles background refresh.
 */
export default function CitySelectionClient({ initialCities }: { initialCities?: CityData[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);

  // Inline search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimCityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  // Store latest t function for use in callbacks without recreating them
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Fetch cities using React Query — initialData from server component
  const {
    data: allCitiesData,
    isLoading,
    error: citiesError,
  } = useQuery({
    queryKey: ['cities'],
    queryFn: async (): Promise<CityData[]> => {
      const response = await fetch('/api/cities');
      const data: CitiesResponse = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Failed to fetch cities');
      }
      return data.data || [];
    },
    initialData: initialCities,
    staleTime: process.env.NODE_ENV === 'development' ? 10 * 1000 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Extract Berlin, Frankfurt, Stuttgart (in that order), with placeholders for missing cities
  const cities = useMemo(() => {
    if (!allCitiesData) return [];
    const targetCities = ['Berlin', 'Frankfurt', 'Stuttgart'];
    return targetCities.map((cityName) => {
      const found = allCitiesData.find((city) => city.city_name === cityName);
      return found || {
        id: `placeholder-${cityName.toLowerCase()}`,
        city_name: cityName,
        country: 'Germany',
        is_unlocked: false,
        interest_count: 0,
        provider_count: 0,
      };
    });
  }, [allCitiesData]);

  // Show error toast if cities fetch failed
  useEffect(() => {
    if (citiesError) {
      console.error('[City Selection] Failed to fetch cities:', citiesError);
      toast.error(tRef.current('common.error'));
    }
  }, [citiesError]);

  // Search cities using Nominatim API
  const searchCities = useCallback(async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSelectedResultIndex(-1);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `addressdetails=1&` +
          `limit=10&` +
          `featuretype=city,town,village&` +
          `countrycodes=`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'UmmahFlow/1.0',
            'Accept-Language': 'de,en',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }

      const data: NominatimCityResult[] = await response.json();

      const formattedCities = data
        .filter((result) => {
          return result.address?.city || result.address?.town || result.address?.village;
        })
        .map((result) => {
          if (result.address?.country) {
            result.address.country = normalizeCountryNameForDisplay(result.address.country);
          }
          return result;
        });

      setSearchResults(formattedCities);
      setSelectedResultIndex(-1);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('[City Search] Error fetching cities:', error);
      setSearchResults([]);
      toast.error(tRef.current('common.error'));
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCities(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  // Update waitlist with selected city
  const updateWaitlistCity = async (email: string, waitlistToken: string, cityName: string) => {
    try {
      const body: Record<string, unknown> = {
        email: email.trim(),
        selected_city: cityName,
      };

      if (waitlistToken) {
        body.waitlistToken = waitlistToken.trim();
      }

      await fetch('/api/waitlist/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error('[City Selection] Failed to update waitlist:', err);
    }
  };

  // Handle city selection from top 3 cities
  const handleCitySelect = useCallback((city: CityData) => {
    setSelectedCityId(city.id);
    setSelectedCityName(city.city_name);

    try {
      sessionStorage.setItem('selectedCity', city.city_name);
      localStorage.setItem('selectedCity', city.city_name);
      window.dispatchEvent(
        new CustomEvent('city-selected', { detail: { cityName: city.city_name } }),
      );

      const verified = localStorage.getItem('selectedCity');
      if (!verified) {
        console.error('[City Selection] Failed to persist city');
        toast.error('Failed to save city. Please enable localStorage.');
        return;
      }
    } catch (error) {
      console.error('[City Selection] LocalStorage error:', error);
      toast.error('Failed to save city. Check browser settings.');
      return;
    }

    const email =
      sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
    const waitlistToken =
      sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';
    const onboardingState = getOnboardingState();

    if (!onboardingState) {
      setOnboardingState({
        email: email || '',
        waitlistSubmitted: !!email,
        earlyAccessUnlocked: true,
        submittedAt: new Date().toISOString(),
        waitlistToken: waitlistToken || undefined,
      });
    }

    if (email) {
      updateWaitlistCity(email, waitlistToken, city.city_name);
    }
  }, []);

  // Handle city selection from search results
  const handleSearchCitySelect = async (city: NominatimCityResult) => {
    const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;

    setSelectedCityId(null);
    setSelectedCityName(cityName);

    sessionStorage.setItem('selectedCity', cityName);
    localStorage.setItem('selectedCity', cityName);
    window.dispatchEvent(new CustomEvent('city-selected', { detail: { cityName } }));

    const email =
      sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
    const waitlistToken =
      sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';
    const onboardingState = getOnboardingState();

    if (!onboardingState) {
      setOnboardingState({
        email: email || '',
        waitlistSubmitted: !!email,
        earlyAccessUnlocked: true,
        submittedAt: new Date().toISOString(),
        waitlistToken: waitlistToken || undefined,
      });
    }

    if (email) {
      await updateWaitlistCity(email, waitlistToken, cityName);
    }

    setSelectedResultIndex(-1);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResultIndex(-1);
    searchInputRef.current?.focus();
  };

  // Handle keyboard navigation in search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (
      e.key === 'Enter' &&
      selectedResultIndex >= 0 &&
      searchResults[selectedResultIndex]
    ) {
      e.preventDefault();
      handleSearchCitySelect(searchResults[selectedResultIndex]);
    }
  };

  // Handle discover CTA
  const handleDiscoverClick = () => {
    if (selectedCityName) {
      router.push('/');
    }
  };

  // Memorized city buttons — no entrance animations, just static buttons
  const cityButtons = useMemo(() => {
    return cities.map((city) => {
      const buttonClassName = cn(
        'flex h-[54px] items-center justify-between rounded-sm border border-border bg-white p-4',
        'transition-all duration-150',
        'hover:bg-neutral-muted hover:border-primary',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        selectedCityId === city.id && 'border-primary bg-primary/5',
      );
      const buttonAriaLabel =
        city.provider_count > 0
          ? `${city.city_name}, ${tRef.current('waitlist.citySelection.providerCount_other').replace('{{count}}', String(city.provider_count))}`
          : city.city_name;

      return (
        <button
          key={city.id}
          aria-label={buttonAriaLabel}
          className={buttonClassName}
          type="button"
          onClick={() => handleCitySelect(city)}
        >
          <div className="flex items-center gap-2">
            <span className="font-inter-tight text-base font-semibold text-content-heading">
              {city.city_name}
            </span>
          </div>
          <Icon
            aria-hidden="true"
            className="size-6 text-content-heading"
            icon={
              selectedCityId === city.id
                ? 'material-symbols:radio-button-checked'
                : 'material-symbols:radio-button-unchecked'
            }
          />
        </button>
      );
    });
  }, [cities, selectedCityId, handleCitySelect]);

  // Shared button style for search result rows
  const searchResultButtonClass = cn(
    'flex h-[54px] items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
    'hover:border-primary hover:bg-neutral-muted',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  );

  return (
    <div className="flex h-full w-full flex-col items-center bg-uflow-light">
      {/* Header */}
      <header
        className={cn('flex w-full items-center justify-center', 'h-20 px-6', 'pt-safe-top')}
        role="banner"
      />

      {/* Body */}
      <main className={cn('flex flex-1 items-center justify-center', 'w-full px-6')} role="main">
        <div className="flex w-full max-w-[345px] flex-col gap-8">
          {/* Title + Subtitle */}
          <div className="flex w-full flex-col gap-4">
            <h1 className="w-full text-center font-inter-tight text-3xl font-semibold leading-[40px] text-content-heading">
              {t('waitlist.citySelection.title')}
            </h1>
            <p className="w-full text-center font-inter text-base leading-[19px] text-content-muted">
              {t('waitlist.citySelection.subtitle')}
            </p>
          </div>

          {/* City List + Search */}
          <div className="flex w-full flex-col gap-3">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex h-[54px] animate-pulse items-center justify-between rounded-sm border border-border bg-white p-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-[19px] w-16 rounded bg-neutral-light" />
                      <div className="h-[19px] w-20 rounded bg-neutral-light" />
                    </div>
                    <div className="size-6 rounded-full bg-neutral-light" />
                  </div>
                ))}
                <div className="flex h-[54px] animate-pulse items-center gap-3 rounded-sm border border-border bg-white p-4">
                  <div className="size-6 rounded bg-neutral-light" />
                  <div className="h-[19px] w-32 rounded bg-neutral-light" />
                </div>
              </>
            ) : (
              <>
                {cityButtons}

                {/* Search Section */}
                <div className="flex flex-col gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <label className="sr-only" htmlFor="city-search-input">
                      {t('waitlist.citySelection.searchPlaceholder')}
                    </label>
                    <div className="flex h-[54px] items-center gap-0 rounded-sm border border-border bg-white px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                      <Search aria-hidden="true" className="size-6 shrink-0 text-content-muted" />
                      <input
                        ref={searchInputRef}
                        aria-controls="city-search-results"
                        aria-describedby="search-results-description"
                        aria-label={t('waitlist.citySelection.searchPlaceholder')}
                        className="flex-1 border-0 bg-transparent pl-0 text-base font-normal text-content-heading outline-none placeholder:text-content-muted focus:ring-0"
                        id="city-search-input"
                        name="city-search"
                        placeholder={t('waitlist.citySelection.searchButton')}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedResultIndex(-1);
                        }}
                        onKeyDown={handleSearchKeyDown}
                      />
                      <div className="flex items-center gap-3">
                        {isSearching && (
                          <Icon
                            aria-label={t('common.loading')}
                            className="size-5 animate-spin text-primary"
                            icon="material-symbols:progress-activity"
                          />
                        )}
                        {searchQuery && !isSearching && (
                          <button
                            aria-label={t('common.delete')}
                            className="flex items-center justify-center rounded p-1 hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-primary"
                            type="button"
                            onClick={handleClearSearch}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-4 text-content-muted"
                              icon="lucide:x"
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search Results (AnimatePresence for enter/exit) */}
                  <AnimatePresence>
                    {(searchQuery.trim().length >= 2 || searchResults.length > 0) && (
                      <motion.div
                        animate={{ opacity: 1, height: 'auto' }}
                        aria-label={t('waitlist.citySelection.searchButton')}
                        className="flex max-h-[300px] flex-col gap-2 overflow-y-auto rounded-sm"
                        exit={{ opacity: 0, height: 0 }}
                        id="city-search-results"
                        initial={{ opacity: 0, height: 0 }}
                        role="listbox"
                        transition={{ duration: 0.2 }}
                      >
                        {searchQuery.trim().length < 2 ? (
                          <p
                            className="py-4 text-center text-sm text-content-muted"
                            id="search-results-description"
                          >
                            {t('waitlist.citySelection.supportingText')}
                          </p>
                        ) : isSearching ? (
                          <div className="flex items-center justify-center py-8">
                            <Icon
                              aria-label={t('common.loading')}
                              className="size-8 animate-spin text-primary"
                              icon="material-symbols:progress-activity"
                            />
                          </div>
                        ) : searchResults.length === 0 ? (
                          <p
                            className="py-4 text-center text-sm text-content-muted"
                            id="search-results-description"
                          >
                            {t('waitlist.citySelection.noResults')}
                          </p>
                        ) : (
                          <>
                            <p className="sr-only" id="search-results-description">
                              {t('waitlist.citySelection.searchButton')}: {searchResults.length}{' '}
                              {searchResults.length === 1 ? 'result' : 'results'} found
                            </p>
                            {searchResults.map((city, index) => {
                              const cityName =
                                city.address?.city ||
                                city.address?.town ||
                                city.address?.village ||
                                city.name;
                              const country = normalizeCountryNameForDisplay(
                                city.address?.country || '',
                              );
                              const isHovered = index === selectedResultIndex;
                              const isCurrentlySelected = selectedCityName === cityName;

                              return (
                                <button
                                  key={city.place_id}
                                  aria-label={`${cityName}${country ? `, ${country}` : ''}`}
                                  aria-selected={isCurrentlySelected || isHovered}
                                  className={cn(
                                    searchResultButtonClass,
                                    (isHovered || isCurrentlySelected) &&
                                      'border-primary bg-primary/5',
                                  )}
                                  role="option"
                                  type="button"
                                  onClick={() => handleSearchCitySelect(city)}
                                  onMouseEnter={() => setSelectedResultIndex(index)}
                                >
                                  <div className="flex flex-col gap-0">
                                    <span className="font-inter-tight text-base font-semibold text-content-heading">
                                      {cityName}
                                    </span>
                                    {country && (
                                      <span className="text-sm text-content-muted">{country}</span>
                                    )}
                                  </div>
                                  <Icon
                                    aria-hidden="true"
                                    className="size-6 text-content-heading"
                                    icon={
                                      isCurrentlySelected
                                        ? 'material-symbols:radio-button-checked'
                                        : 'material-symbols:radio-button-unchecked'
                                    }
                                  />
                                </button>
                              );
                            })}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* CTA Button */}
          <div className="w-full">
            <button
              aria-label={t('waitlist.citySelection.discoverButton')}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-sm font-inter-tight text-base font-medium text-white transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                selectedCityName
                  ? 'bg-primary hover:bg-primary-dark'
                  : 'cursor-not-allowed bg-primary/50',
              )}
              disabled={!selectedCityName}
              type="button"
              onClick={handleDiscoverClick}
            >
              <Icon aria-hidden="true" className="size-6" icon="lucide:store" />
              <span>{t('waitlist.citySelection.discoverButton')}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Navbar (hidden) */}
      <nav
        className={cn(
          'flex w-full items-center justify-between',
          'h-20 px-6',
          'pb-safe-bottom',
          'hidden',
        )}
        role="navigation"
      />
    </div>
  );
}
