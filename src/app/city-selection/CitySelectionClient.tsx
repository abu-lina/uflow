'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
 * City Selection Client Component - Simplified Design with Inline Search
 *
 * Fixed layout showing top 3 cities with inline search input and discover CTA.
 * No scrolling, clean centered design matching Early Access screen.
 *
 * Features:
 * - Shows top 3 cities by interest/provider count
 * - Inline search input (expands on button click)
 * - Global city search using Nominatim API
 * - Discover CTA to browse providers
 * - Safe area handling
 * - Reduced motion support
 * - Full accessibility support
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

  // Track if initial animation has completed to prevent re-animation on re-renders
  // Use state instead of ref so useMemo recalculates when animation completes
  const [hasAnimated, setHasAnimated] = useState(false);
  // Store latest t function for use in error handlers
  const tRef = useRef(t);

  // Update t ref whenever t changes
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fetch cities using React Query with caching
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
    staleTime: process.env.NODE_ENV === 'development' ? 10 * 1000 : 5 * 60 * 1000, // 10 seconds in dev, 5 minutes in prod
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Don't refetch on window focus (cached data is fine)
    refetchOnMount: false, // Use cached data if available
  });

  // Process cities data: Always show Berlin, Frankfurt, and Stuttgart in that order
  const cities = useMemo(() => {
    if (!allCitiesData) return [];

    const targetCities = ['Berlin', 'Frankfurt', 'Stuttgart'];
    const result: CityData[] = [];

    for (const cityName of targetCities) {
      const found = allCitiesData.find((city) => city.city_name === cityName);
      if (found) {
        result.push(found);
      } else {
        // Create placeholder if city not found in database
        result.push({
          id: `placeholder-${cityName.toLowerCase()}`,
          city_name: cityName,
          country: 'Germany',
          is_unlocked: false,
          interest_count: 0,
          provider_count: 0,
        });
      }
    }

    return result;
  }, [allCitiesData]);

  // Show error toast if cities fetch failed
  useEffect(() => {
    if (citiesError) {
      console.error('[City Selection] Failed to fetch cities:', citiesError);
      toast.error(tRef.current('common.error'));
    }
  }, [citiesError]);

  // Mark animation as complete after cities have loaded and animation time has passed
  useEffect(() => {
    if (!isLoading && cities.length > 0 && !hasAnimated) {
      const animationDuration = prefersReducedMotion ? 0 : 0.3 + (cities.length - 1) * 0.05;
      const timer = setTimeout(
        () => {
          setHasAnimated(true);
        },
        (animationDuration + 0.1) * 1000,
      ); // Add small buffer

      return () => clearTimeout(timer);
    }
  }, [isLoading, cities.length, prefersReducedMotion, hasAnimated]);

  // Search cities using Nominatim API
  const searchCities = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSelectedResultIndex(-1);
      return;
    }

    setIsSearching(true);

    try {
      // Use Nominatim search API for cities
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          `format=json&` +
          `q=${encodeURIComponent(query)}&` +
          `addressdetails=1&` +
          `limit=10&` +
          `featuretype=city,town,village&` +
          `countrycodes=`, // Empty = all countries
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'UmmahFlow/1.0', // Required by Nominatim ToS
            'Accept-Language': 'de,en', // Prefer German, fallback to English
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }

      const data: NominatimCityResult[] = await response.json();

      // Filter and format results, replacing Israel with Palestine
      const formattedCities = data
        .filter((result) => {
          // Only include results that have a city/town/village name
          return result.address?.city || result.address?.town || result.address?.village;
        })
        .map((result) => {
          // Replace Israel with Palestine in country field
          if (result.address?.country) {
            result.address.country = normalizeCountryNameForDisplay(result.address.country);
          }
          return result;
        });

      setSearchResults(formattedCities);
      setSelectedResultIndex(-1);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('[City Search] Error fetching cities:', error);
      setSearchResults([]);
      // Use tRef to get latest translation function without causing callback recreation
      toast.error(tRef.current('common.error'));
    } finally {
      setIsSearching(false);
    }
  }, []); // Empty deps - t is accessed via tRef

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCities(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, searchCities]);

  // Handle city selection (from top 3 cities) - memoized to prevent re-renders
  const handleCitySelect = useCallback((city: CityData) => {
    setSelectedCityId(city.id);
    setSelectedCityName(city.city_name);

    // Store selected city with verification
    try {
      sessionStorage.setItem('selectedCity', city.city_name);
      localStorage.setItem('selectedCity', city.city_name);

      // Dispatch custom event to notify useAppStage hook immediately
      window.dispatchEvent(
        new CustomEvent('city-selected', { detail: { cityName: city.city_name } }),
      );

      // Verify persistence
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

    // CRITICAL: Ensure onboarding state exists when city is selected
    // Always create onboarding state, even without email (for pre-launch flow)
    const email =
      sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
    const waitlistToken =
      sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';
    const onboardingState = getOnboardingState();

    if (!onboardingState) {
      // Create onboarding state (with or without email)
      setOnboardingState({
        email: email || '',
        waitlistSubmitted: !!email, // Only true if email exists
        earlyAccessUnlocked: true,
        submittedAt: new Date().toISOString(),
        waitlistToken: waitlistToken || undefined,
      });
    }

    // Try to update waitlist if email/token available (for future compatibility)
    if (email) {
      updateWaitlistCity(email, waitlistToken, city.city_name);
    }

    // DO NOT auto-forward - user must explicitly tap CTA button
  }, []); // Empty deps - uses state setters and refs which are stable

  // Handle city selection from search results
  const handleSearchCitySelect = async (city: NominatimCityResult) => {
    const cityName = city.address?.city || city.address?.town || city.address?.village || city.name;

    setSelectedCityId(null); // Clear top 3 selection
    setSelectedCityName(cityName);

    // Store selected city
    sessionStorage.setItem('selectedCity', cityName);
    localStorage.setItem('selectedCity', cityName);

    // Dispatch custom event to notify useAppStage hook immediately
    window.dispatchEvent(new CustomEvent('city-selected', { detail: { cityName } }));

    // CRITICAL: Ensure onboarding state exists when city is selected
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

    // Try to update waitlist if email/token available
    if (email) {
      await updateWaitlistCity(email, waitlistToken, cityName);
    }

    // DO NOT clear search query/results - keep them visible so user can select another city
    // Only reset the selected result index
    setSelectedResultIndex(-1);

    // DO NOT auto-forward - user must explicitly tap CTA button
  };

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error('[City Selection] Failed to update waitlist:', err);
      // Don't show error to user, city is still stored locally
    }
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

  // Handle discover CTA - navigate to home discovery page
  const handleDiscoverClick = () => {
    if (selectedCityName) {
      router.push('/');
    }
  };

  // Memoize city buttons to prevent re-renders when LanguageProvider context changes
  // Use tRef.current to avoid dependency on t function reference
  // Include hasAnimated in dependencies so memo recalculates when animation completes
  const cityButtons = useMemo(() => {
    return cities.map((city, index) => {
      // Only animate on initial mount, not on re-renders
      const shouldAnimate = !hasAnimated && !isLoading;

      // Always use motion.button but conditionally control animation props
      // This prevents React from unmounting/remounting when switching component types
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

      // Conditionally include animation props only when shouldAnimate is true
      // When false, explicitly set initial={false} to disable all Framer Motion processing
      const motionProps = shouldAnimate
        ? {
            animate: { opacity: 1, x: 0 },
            initial: { opacity: 0, x: -20 },
            transition: prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.3, delay: index * 0.05 },
          }
        : {
            initial: false, // Explicitly disable Framer Motion processing
            animate: false, // Explicitly disable animation
          };

      return (
        <motion.button
          key={city.id}
          {...motionProps}
          aria-label={buttonAriaLabel}
          className={buttonClassName}
          layout={false}
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
        </motion.button>
      );
    });
  }, [cities, selectedCityId, isLoading, prefersReducedMotion, hasAnimated, handleCitySelect]);

  return (
    <div className="flex h-full w-full flex-col items-center bg-uflow-light">
      {/* Header - 80px with safe area */}
      <header
        className={cn('flex w-full items-center justify-center', 'h-20 px-6', 'pt-safe-top')}
        role="banner"
      >
        {/* Reserved for future header content */}
      </header>

      {/* Body - Centered content */}
      <main className={cn('flex flex-1 items-center justify-center', 'w-full px-6')} role="main">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-[345px] flex-col gap-8"
          initial={{ opacity: 0, y: 20 }}
          layout={false}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
        >
          {/* Title + Subtitle */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col gap-4"
            initial={{ opacity: 0, y: 20 }}
            layout={false}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.4, delay: 0.1, ease: 'easeOut' }
            }
          >
            {/* Title */}
            <h1 className="w-full text-center font-inter-tight text-3xl font-semibold leading-[40px] text-content-heading">
              {t('waitlist.citySelection.title')}
            </h1>

            {/* Subtitle */}
            <p className="w-full text-center font-inter text-base leading-[19px] text-content-muted">
              {t('waitlist.citySelection.subtitle')}
            </p>
          </motion.div>

          {/* City List + Search */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            layout={false}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.4, delay: 0.2, ease: 'easeOut' }
            }
          >
            {isLoading ? (
              // Loading skeleton
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
                {/* Top 3 Cities - Memoized to prevent re-renders on context changes */}
                {cityButtons}

                {/* Search Input */}
                <motion.div
                  animate={!hasAnimated && !isLoading ? { opacity: 1, x: 0 } : false}
                  className="flex flex-col gap-2"
                  initial={
                    !hasAnimated && !isLoading ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }
                  }
                  layout={false}
                  transition={
                    prefersReducedMotion ? { duration: 0 } : { duration: 0.3, delay: 0.15 }
                  }
                >
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

                  {/* Search Results */}
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
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
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
                                <motion.button
                                  key={city.place_id}
                                  animate={{ opacity: 1, x: 0 }}
                                  aria-label={`${cityName}${country ? `, ${country}` : ''}`}
                                  aria-selected={isCurrentlySelected || isHovered}
                                  className={cn(
                                    'flex h-[54px] items-center justify-between rounded-sm border border-border bg-white p-4 text-left transition-all duration-150',
                                    'hover:border-primary hover:bg-neutral-muted',
                                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                                    (isHovered || isCurrentlySelected) &&
                                      'border-primary bg-primary/5',
                                  )}
                                  initial={{ opacity: 0, x: -20 }}
                                  layout={false}
                                  role="option"
                                  transition={
                                    prefersReducedMotion
                                      ? { duration: 0 }
                                      : { duration: 0.2, delay: index * 0.03 }
                                  }
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
                                </motion.button>
                              );
                            })}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            layout={false}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.4, delay: 0.3, ease: 'easeOut' }
            }
          >
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
          </motion.div>
        </motion.div>
      </main>

      {/* Navbar - 80px with safe area (hidden) */}
      <nav
        className={cn(
          'flex w-full items-center justify-between',
          'h-20 px-6',
          'pb-safe-bottom',
          'hidden', // Hidden as specified in design
        )}
        role="navigation"
      >
        {/* Reserved for future navbar content */}
      </nav>
    </div>
  );
}
