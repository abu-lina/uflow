'use client';

import { useCallback, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { CategoryFilter } from '@/components/providers/CategoryFilter';
import { SearchResultsList } from '@/components/providers/SearchResultsList';
import { EmptyState, SkeletonGrid } from '@/components/ui';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/providers/LoadingProvider';
import { useSearch } from '@/providers/search-provider';
import {
  searchProvidersAndCommunityServices,
  getBookmarkedProviders,
  type Provider,
} from '@/services/providers';

export function ProvidersContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: userLoading } = useAuth();
  const searchParams = useSearchParams();
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

  const { isPreloading } = useLoading();

  // Use React Query for search results - properly cached across navigation
  const { data: searchResults = [], isLoading: loading, isFetching, error } = useQuery({
    queryKey: ['providers', query, category || 'Alle', location],
    queryFn: () => searchProvidersAndCommunityServices(query, category || 'Alle', location),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use React Query for bookmarks
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const bookmarks = await getBookmarkedProviders(user.id);
      return bookmarks.map((s) => s.provider_id);
    },
    enabled: !!user && !userLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Memoized event handlers with optimistic updates
  const handleBookmarkChange = useCallback((providerId: string, isBookmarked: boolean) => {
    // Optimistically update the cache
    queryClient.setQueryData(['bookmarks', user?.id], (old: string[] = []) => {
      if (isBookmarked) {
        return [...old, providerId];
      } else {
        return old.filter((id) => id !== providerId);
      }
    });
  }, [queryClient, user?.id]);

  const handleProviderClick = useCallback((provider: Provider) => {
    // Navigate to provider detail page instead of opening modal
    router.push(`/providers/${provider.provider_id}`);
  }, [router]);

  // Handle search submission - update URL with new parameters
  const handleSearchSubmit = useCallback((query: string, category: string | null, location: string) => {
    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    }
    if (category) {
      params.set('category', category);
    }
    if (location) {
      params.set('location', location);
    }
    router.replace(`/providers?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle clear search - remove query from URL
  const handleClearSearch = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    router.replace(`/providers?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle category change - update URL with new category
  const handleCategoryChange = useCallback((category: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    router.replace(`/providers?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle location change - update URL with new location
  const handleLocationChange = useCallback((location: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('location', location);
    router.replace(`/providers?${params.toString()}`, { scroll: false });
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

  // During preloading, show skeleton loading
  if (isPreloading) {
    return (
      <div className="relative min-h-full">
        {/* Mobile Header Container - Stable, doesn't re-render */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden pt-safe-top">
        {/* Search Bar */}
        <div className="px-4 pb-0 pt-4">
          <SearchBar
            className="rounded-lg border border-gray-200 shadow-sm"
            hideCategoryFilter={true}
            onCategoryChange={handleCategoryChange}
            onClearSearch={handleClearSearch}
            onLocationChange={handleLocationChange}
            onSearchSubmit={handleSearchSubmit}
          />
        </div>

          {/* Gap */}
          <div className="h-3 px-6" />

          {/* Category Filter */}
          <div className="pb-1.5 pl-6 pr-0">
            <CategoryFilter />
          </div>
        </div>

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
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden pt-safe-top">
        {/* Search Bar */}
        <div className="px-6 pb-0 pt-4">
          <SearchBar
            className="rounded-lg border border-gray-200 shadow-sm"
            hideCategoryFilter={true}
            onCategoryChange={handleCategoryChange}
            onClearSearch={handleClearSearch}
            onLocationChange={handleLocationChange}
            onSearchSubmit={handleSearchSubmit}
          />
        </div>

          {/* Gap */}
          <div className="h-3 px-6" />

          {/* Category Filter */}
          <div className="pb-1.5 pl-6 pr-0">
            <CategoryFilter />
          </div>
        </div>

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
      <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl sm:hidden pt-safe-top">
      {/* Search Bar */}
      <div className="px-4 pb-0 pt-6">
        <SearchBar
          className="rounded-lg border border-gray-200 shadow-sm"
          hideCategoryFilter={true}
          onCategoryChange={handleCategoryChange}
          onClearSearch={handleClearSearch}
          onLocationChange={handleLocationChange}
          onSearchSubmit={handleSearchSubmit}
        />
      </div>

        {/* Gap */}
        <div className="h-3 px-6" />

        {/* Category Filter */}
        <div className="pb-1.5 pl-6 pr-0">
          <CategoryFilter />
        </div>
      </div>

      {/* Main Content - Only this area updates with smooth transitions */}
      <div className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden mobile-nav-spacing pt-32 sm:pt-8 md:pt-28">
        {loading && searchResults.length === 0 ? (
            <div>
              <SkeletonGrid count={12} />
            </div>
          ) : searchResults.length === 0 && !loading && !isFetching ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 text-5xl text-amber-500/60">
                🔍
              </div>
              <h3 className="mb-2 text-xl font-medium text-gray-800">
                Keine Ergebnisse gefunden
              </h3>
              <p className="max-w-sm text-sm text-gray-500">
                Versuche einen anderen Suchbegriff oder Filter
              </p>
            </div>
          ) : (
            <SearchResultsList
              bookmarkedProviderIds={bookmarkedProviderIds}
              searchResults={searchResults}
              onBookmarkChange={handleBookmarkChange}
              onProviderClick={handleProviderClick}
            />
          )}
      </div>

    </div>
  );
}
