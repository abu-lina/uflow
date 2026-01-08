'use client';

import { useCallback, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { ProvidersPageHeader } from '@/components/providers/ProvidersPageHeader';
import { SearchResultsList } from '@/components/providers/SearchResultsList';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { supabase } from '@/lib/supabase/client';
import { useSearch } from '@/providers/search-provider';
import {
  searchProvidersAndCommunityServices,
  type Provider,
} from '@/services/providers';

interface ProvidersContentProps {
  defaultLocation?: string; // For Stage 2: render on root with city filter
  showGreeting?: boolean; // Show greeting header instead of search bar and category filter
}

export function ProvidersContent({ defaultLocation, showGreeting = false }: ProvidersContentProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  
  // Get search context to sync with URL parameters
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
  } = useSearch();

  // Priority: defaultLocation > URL param > context > fallback
  const location = defaultLocation || 
                   searchParams.get('location') || 
                   selectedLocation || 
                   t('search.everywhere');
  const query = searchParams.get('q') || '';

  // Use provider state for category, fallback to URL params
  const category = selectedCategory ?? (searchParams.get('category') || null);

  // Use React Query infinite query for paginated search results
  // Page size: 12 provides good balance between initial load and frequent pagination
  const PAGE_SIZE = 12;
  
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['providers', query, category || t('search.all'), location],
    queryFn: ({ pageParam = 0 }) => 
      searchProvidersAndCommunityServices(query, category || t('search.all'), location, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) => 
      lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep unused data for 10 min
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    refetchOnMount: false, // Use cached data if available
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    // Show cached data immediately while refetching in background
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const searchResults = data?.pages.flatMap((page) => page.results) ?? [];

  // Use React Query for bookmarks - includes both providers and community services
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch all bookmarks (providers and community services)
      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select('bookmarkable_id, bookmarkable_type')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
      }
      
      // Return all bookmarkable IDs (both providers and community services)
      return bookmarks?.map((b) => b.bookmarkable_id) || [];
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
    // Navigate to appropriate detail page based on type
    if (provider.community_service_id) {
      // This is a community service
      router.push(`/community-services/${provider.community_service_id}`);
    } else {
      // This is a provider
      router.push(`/providers/${provider.provider_id}`);
    }
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

  // Sync location/category/query with search context - only when they actually change
  useEffect(() => {
    // Use resolved location as source of truth (defaultLocation > URL param > context > fallback)
    // This prevents unnecessary re-renders and state conflicts
    if (category !== selectedCategory) {
      setSelectedCategory(category);
    }
    if (query !== searchQuery) {
      setSearchQuery(query);
    }
    // Sync location: if defaultLocation is provided, use it; otherwise use URL param or context
    const locationToSync = defaultLocation || searchParams.get('location') || selectedLocation;
    if (locationToSync && locationToSync !== selectedLocation) {
      setSelectedLocation(locationToSync);
    }
    // ESLint warning is intentionally ignored here to prevent infinite loops
    // The setter functions are stable and don't need to be in dependencies
    // Including searchQuery, selectedCategory, selectedLocation would cause infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, location, defaultLocation]); // Include defaultLocation to sync when it changes

  // Prefetch likely next pages after initial load (performance optimization)
  useEffect(() => {
    // Only prefetch if user is logged in and page has loaded
    if (user && !isLoading && !userLoading) {
      // Prefetch profile and saved pages user is likely to visit
      router.prefetch('/profile');
      router.prefetch('/saved');
    }
  }, [user, isLoading, userLoading, router]);

  // Render content based on state
  // Only show loading skeleton on true initial load (isLoading = true means no cached data)
  // If we have cached data, show it immediately even if isFetching (background refetch)
  const renderContent = () => {
    // True initial load: isLoading is true only when there's no cached data AND currently fetching
    // In React Query v5: isLoading = isPending && isFetching
    // Show skeleton grid matching the actual grid layout
    if (isLoading) {
      return <SkeletonGrid count={12} />;
    }

    if (error) {
      return (
        <EmptyState
          description={t('providers.errorLoading')}
          title={t('providers.errorTitle')}
        />
      );
    }

    // Empty state: only show if we have no results
    if (searchResults.length === 0) {
      return (
        <EmptyState
          description={t('providers.noResultsDescription')}
          title={t('providers.noResultsFound')}
        />
      );
    }

    // Show results (cached data shown immediately, background refetch doesn't block UI)
    return (
      <SearchResultsList
        bookmarkedProviderIds={bookmarkedProviderIds}
        error={error}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        searchResults={searchResults}
        onBookmarkChange={handleBookmarkChange}
        onLoadMore={fetchNextPage}
        onProviderClick={handleProviderClick}
        onRetry={() => refetch()}
      />
    );
  };

  return (
    <>
      {showGreeting ? (
        // Fixed greeting header for Stage 2 (matches ProvidersPageHeader style)
        <header 
          className="fixed left-0 right-0 top-0 z-50 sm:hidden"
          style={{
            // Smooth transition for all properties including backdrop-filter
            transition: 'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
            // Glassy blur effect - always applied for consistent visual effect
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
            isolation: 'isolate',
            marginLeft: '-1px',
            marginRight: '-1px',
            paddingLeft: '1px',
            paddingRight: '1px',
          }}
        >
          <div 
            className="px-6 py-4"
            style={{
              // Add safe area padding to content, not header background
              // Use max() to ensure minimum 24px padding on devices without safe area (like iPhone SE)
              paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
            }}
          >
            <MobileGreetingHeader cityName={defaultLocation} />
          </div>
        </header>
      ) : (
        // Search bar and category filter header (fixed)
        <ProvidersPageHeader
          onCategoryChange={handleCategoryChange}
          onClearSearch={handleClearSearch}
          onLocationChange={handleLocationChange}
          onSearchSubmit={handleSearchSubmit}
        />
      )}

      <main className={`w-full mx-auto min-h-full max-w-screen-xl overflow-x-hidden mobile-nav-spacing ${
        showGreeting 
          ? 'pt-0 sm:pt-8 md:pt-28' // No top padding - CityCard pb-8 provides the gap, fixed header overlays
          : 'pt-32 sm:pt-8 md:pt-28' // Full padding when fixed header is shown
      }`}>
        {renderContent()}
      </main>
    </>
  );
}
