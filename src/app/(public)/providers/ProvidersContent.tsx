'use client';

import { useCallback, useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { CategoryFilter } from '@/components/providers/CategoryFilter';
import { SearchResultsList } from '@/components/providers/SearchResultsList';
import { EmptyState, SkeletonGrid } from '@/components/ui';
import { sharedTransition } from '@/components/ui/PageTransition';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/providers/LoadingProvider';
import { useSearch } from '@/providers/search-provider';
import {
  searchProvidersAndCommunityServices,
  getBookmarkedProviders,
  type Provider,
  type SearchResult,
} from '@/services/providers';

export function ProvidersContent() {
  const router = useRouter();
  const { user, loading: userLoading } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [bookmarkedProviderIds, setBookmarkedProviderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const searchParams = useSearchParams();
  const [paramVersion, setParamVersion] = useState(0);
  const location = searchParams.get('location') || 'Überall';
  const query = searchParams.get('q') || '';

  // Get search context to sync with URL parameters
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
  } = useSearch();

  // Use provider state for category, fallback to URL params
  const category = selectedCategory ?? (searchParams.get('category') || null);

  // Cache for search results data
  const [searchCache, setSearchCache] = useState<Record<string, SearchResult[]>>({});

  const { isPreloading } = useLoading();

  // Memoized event handlers
  const handleBookmarkChange = useCallback((providerId: string, isBookmarked: boolean) => {
    if (isBookmarked) {
      setBookmarkedProviderIds((prev) => [...prev, providerId]);
    } else {
      setBookmarkedProviderIds((prev) => prev.filter((id) => id !== providerId));
    }
  }, []);

  const handleProviderClick = useCallback((provider: Provider) => {
    // Navigate to provider detail page instead of opening modal
    router.push(`/providers/${provider.provider_id}`);
  }, [router]);


  // Sync URL parameters with search context - only when they actually change
  useEffect(() => {
    // Use URL parameters as source of truth, but only update if they've changed
    // This prevents unnecessary re-renders and state conflicts
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
    if (location !== selectedLocation) {
      setSelectedLocation(location);
    }
    // ESLint warning is intentionally ignored here to prevent infinite loops
    // The setter functions are stable and don't need to be in dependencies
    // Including searchQuery, selectedCategory, selectedLocation would cause infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, location]); // Only depend on URL parameters, not local state

  useEffect(() => {
    setParamVersion((v) => v + 1);
  }, [searchParams]);

  // Detect navigation changes to prevent flashy loads
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    async function fetchProviders() {
      const cacheKey = `${query}-${category}-${location}`;

      // If we have cached data, use it immediately
      if (searchCache[cacheKey]) {
        setSearchResults(searchCache[cacheKey]);
        setIsInitialRender(false);
        return;
      }

      try {
        // Only show loading if it takes more than 200ms and it's not the initial render
        const loadingTimeout = setTimeout(() => {
          if (!isInitialRender && !isNavigating) {
            setLoading(true);
          }
        }, 200);

        const data = await searchProvidersAndCommunityServices(query, category || 'Alle', location);
        setSearchResults(data);

        // Cache the results
        setSearchCache((prev) => ({
          ...prev,
          [cacheKey]: data,
        }));

        clearTimeout(loadingTimeout);
        setLoading(false);
        setIsInitialRender(false);
      } catch (err) {
        setError('Failed to load providers');
        console.error('Error loading providers:', err);
        setLoading(false);
        setIsInitialRender(false);
      }
    }

    void fetchProviders();
  }, [query, category, location, paramVersion, searchCache, isInitialRender, isNavigating]);

  // Optimize bookmark fetching
  useEffect(() => {
    if (user && !userLoading) {
      const loadingTimeout = setTimeout(() => {
        if (!isInitialRender && !isNavigating) {
          setLoading(true);
        }
      }, 200);

      getBookmarkedProviders(user.id)
        .then((bookmarkedProviders) => {
          setBookmarkedProviderIds(bookmarkedProviders.map((s) => s.provider_id));
          clearTimeout(loadingTimeout);
          setLoading(false);
        })
        .catch(() => {
          setBookmarkedProviderIds([]);
          clearTimeout(loadingTimeout);
          setLoading(false);
        });
    } else if (!userLoading) {
      setBookmarkedProviderIds([]);
    }
  }, [user, userLoading, isInitialRender, isNavigating]);

  // During preloading, show skeleton loading
  if (isPreloading) {
    return (
      <div className="relative min-h-full">
        {/* Mobile Header Container - Stable, doesn't re-render */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden"
          initial={{ opacity: 0, y: -1 }}
          transition={sharedTransition}
        >
          {/* Search Bar */}
          <div className="px-4 pb-0 pt-4">
            <SearchBar
              className="rounded-lg border border-gray-200 shadow-sm"
              hideCategoryFilter={true}
            />
          </div>

          {/* Gap */}
          <div className="h-3 px-6" />

          {/* Category Filter */}
          <div className="pb-1.5 pl-6 pr-0">
            <CategoryFilter />
          </div>
        </motion.div>

        {/* Main Content - Loading State */}
        <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-32 sm:pt-8 md:pt-28">
          <SkeletonGrid count={12} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-full">
        {/* Mobile Header Container - Stable, doesn't re-render */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden"
          initial={{ opacity: 0, y: -1 }}
          transition={sharedTransition}
        >
          {/* Search Bar */}
          <div className="px-6 pb-0 pt-4">
            <SearchBar
              className="rounded-lg border border-gray-200 shadow-sm"
              hideCategoryFilter={true}
            />
          </div>

          {/* Gap */}
          <div className="h-3 px-6" />

          {/* Category Filter */}
          <div className="pb-1.5 pl-6 pr-0">
            <CategoryFilter />
          </div>
        </motion.div>

        {/* Main Content - Error State */}
        <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden py-8 pt-32 sm:pt-8 md:pt-28">
          <EmptyState
            description="Es gab ein Problem beim Laden der Providers. Bitte versuche es erneut."
            title="Fehler beim Laden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {/* Mobile Header Container - Stable, doesn't re-render */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden"
        initial={{ opacity: 0, y: -1 }}
        transition={sharedTransition}
      >
        {/* Search Bar */}
        <div className="px-4 pb-0 pt-6">
          <SearchBar
            className="rounded-lg border border-gray-200 shadow-sm"
            hideCategoryFilter={true}
          />
        </div>

        {/* Gap */}
        <div className="h-3 px-6" />

        {/* Category Filter */}
        <div className="pb-1.5 pl-6 pr-0">
          <CategoryFilter />
        </div>
      </motion.div>

      {/* Main Content - Only this area updates with smooth transitions */}
      <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden pb-20 pt-32 sm:pt-8 md:pt-28">
        {loading && !isInitialRender && !isNavigating ? (
            <motion.div
              key="loading"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SkeletonGrid count={12} />
            </motion.div>
          ) : searchResults.length === 0 && !loading ? (
            <motion.div
              key="empty"
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
              exit={{ opacity: 0, y: 20 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Beautiful Islamic ornament */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, -5, 0],
                }}
                className="mb-6 text-6xl text-amber-500/60"
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                ✨
              </motion.div>

              {/* Main message with beautiful typography */}
              <motion.h3
                animate={{ opacity: [0.7, 1, 0.7] }}
                className="font-arabic mb-4 text-3xl font-light tracking-wide text-gray-800"
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ṣabr ist Licht
              </motion.h3>

              {/* Subtitle with elegant styling */}
              <motion.p
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                className="max-w-sm text-sm font-medium text-gray-500"
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              >
                Geduld bringt Erleuchtung
              </motion.p>

              {/* Decorative line */}
              <motion.div
                animate={{ scaleX: [0, 1, 0] }}
                className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SearchResultsList
                bookmarkedProviderIds={bookmarkedProviderIds}
                searchResults={searchResults}
                onBookmarkChange={handleBookmarkChange}
                onProviderClick={handleProviderClick}
              />
            </motion.div>
          )}
      </div>

    </div>
  );
}
