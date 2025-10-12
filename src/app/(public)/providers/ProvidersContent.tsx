'use client';

import { useCallback, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ProvidersPageHeader } from '@/components/providers/ProvidersPageHeader';
import { SearchResultsList } from '@/components/providers/SearchResultsList';
import { EmptyState, SkeletonGrid } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { useLoading } from '@/providers/LoadingProvider';
import { useSearch } from '@/providers/search-provider';
import {
  searchProvidersAndCommunityServices,
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

  // Render content based on state
  const renderContent = () => {
    if (isPreloading || (loading && searchResults.length === 0)) {
      return <SkeletonGrid count={12} />;
    }

    if (error) {
      return (
        <EmptyState
          description="Es gab ein Problem beim Laden der Providers. Bitte versuche es erneut."
          title="Fehler beim Laden"
        />
      );
    }

    if (searchResults.length === 0 && !loading && !isFetching) {
      return (
        <EmptyState
          description="Versuche einen anderen Suchbegriff oder Filter"
          title="Keine Ergebnisse gefunden"
        />
      );
    }

    return (
      <SearchResultsList
        bookmarkedProviderIds={bookmarkedProviderIds}
        searchResults={searchResults}
        onBookmarkChange={handleBookmarkChange}
        onProviderClick={handleProviderClick}
      />
    );
  };

  return (
    <div className="relative min-h-full">
      <ProvidersPageHeader
        onCategoryChange={handleCategoryChange}
        onClearSearch={handleClearSearch}
        onLocationChange={handleLocationChange}
        onSearchSubmit={handleSearchSubmit}
      />

      <main className="mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden mobile-nav-spacing pt-32 sm:pt-8 md:pt-28">
        {renderContent()}
      </main>
    </div>
  );
}
