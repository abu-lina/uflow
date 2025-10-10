'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ScrollablePageHeader } from '@/components/layout/ScrollablePageHeader';
import { CreatedProviderCard } from '@/components/shared/CreatedProviderCard';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useContainerScroll } from '@/hooks/useContainerScroll';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import { deleteBookmark } from '@/services/bookmarks';
import { getAllBookmarkedItems, type Provider } from '@/services/providers';

export default function SavedProvidersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchQuery, selectedLocation } = useSearch();
  const { isHeaderVisible } = useContainerScroll();

  // Use React Query for all bookmarked items (providers + community services)
  const { data: providers = [], isLoading: loading } = useQuery({
    queryKey: ['saved-providers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getAllBookmarkedItems(user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter providers based on search query and location
  const filteredProviders = useMemo(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((provider) => {
        const nameMatch = provider.provider_name?.toLowerCase().includes(query);
        const addressMatch = 
          provider.address_street?.toLowerCase().includes(query) ||
          provider.address_city?.toLowerCase().includes(query);
        const categoryMatch = provider.category?.name_de?.toLowerCase().includes(query);
        return nameMatch || addressMatch || categoryMatch;
      });
    }

    // Filter by location
    if (selectedLocation && selectedLocation !== 'Überall') {
      filtered = filtered.filter((provider) => 
        provider.address_city?.toLowerCase() === selectedLocation.toLowerCase()
      );
    }

    return filtered;
  }, [providers, searchQuery, selectedLocation]);

  const handleUnsave = async (providerId: string, isCommunityService: boolean) => {
    if (!user) return;
    try {
      // Determine the correct bookmarkable_type
      const bookmarkableType = isCommunityService ? 'community_service' : 'provider';
      
      // Find the bookmark
      const { data: bookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('bookmarkable_id', providerId)
        .eq('bookmarkable_type', bookmarkableType)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching bookmark:', fetchError);
        return;
      }
      
      if (bookmark) {
        await deleteBookmark(bookmark.id);
        
        // Optimistically update the cache
        queryClient.setQueryData(['saved-providers', user.id], (old: Provider[] = []) => 
          old.filter((s) => s.provider_id !== providerId)
        );
        
        // Also update the bookmarks list cache used by other components
        queryClient.setQueryData(['bookmarks', user.id], (old: string[] = []) =>
          old.filter((id) => id !== providerId)
        );
      }
    } catch (err) {
      // Optionally show a toast or error
      console.error('Fehler beim Entfernen des Items:', err);
    }
  };

  // SearchBar callbacks - no-ops since we handle filtering locally via context
  // The search context state is already being used in filteredProviders
  const handleSearchSubmit = () => {
    // No navigation needed - filtering happens automatically via useMemo
  };

  const handleClearSearch = () => {
    // No action needed - clearing is handled by SearchBar updating context
  };

  const handleCategoryChange = () => {
    // No action needed - category changes handled by SearchBar updating context
  };

  const handleLocationChange = () => {
    // No action needed - location changes handled by SearchBar updating context
  };


  if (!user) {
    return (
      <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
        {/* Header */}
        <ScrollablePageHeader 
          isVisible={true}
          title="Gespeichert"
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-20 mobile-nav-spacing">
          <span className="text-center text-lg text-content-title mb-6">
            Du musst angemeldet sein, um gespeicherte Inhalte zu sehen.
          </span>
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            onClick={() => router.push('/login')}
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Scrollable Header */}
      <ScrollablePageHeader 
        isVisible={isHeaderVisible}
        title="Gespeichert"
      />

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderVisible ? 'h-16' : 'h-0'
      }`} />

      {/* Main Content with scroll container */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        {/* Search Bar */}
        <div className="w-full mb-6">
          <SearchBar 
            hideCategoryFilter={true}
            onCategoryChange={handleCategoryChange}
            onClearSearch={handleClearSearch}
            onLocationChange={handleLocationChange}
            onSearchSubmit={handleSearchSubmit}
          />
        </div>
        
        <div className="grid w-full grid-cols-2 gap-4">
        {providers.length === 0 ? (
          <span className="col-span-2 text-center text-gray-400">Keine Providers gespeichert.</span>
        ) : filteredProviders.length === 0 ? (
          <span className="col-span-2 text-center text-gray-400">Keine Providers gefunden.</span>
        ) : (
          filteredProviders.map((provider) => {
            const isCommunityService = !!provider.community_service_id;
            const detailPath = isCommunityService 
              ? `/community-services/${provider.community_service_id}`
              : `/providers/${provider.provider_id}`;
            
            return (
              <CreatedProviderCard
                key={provider.provider_id}
                address={
                  provider.address_street && provider.address_city
                    ? `${provider.address_street}, ${provider.address_city}`
                    : provider.address_street || provider.address_city || undefined
                }
                category={provider.category?.name_de || ''}
                imageUrl={(() => {
                  if (!provider.provider_images) return '/images/placeholder.jpg';
                  try {
                    let imagesData: { urls?: string[] } = {};
                    if (typeof provider.provider_images === 'string') {
                      imagesData = JSON.parse(provider.provider_images);
                    } else if (Array.isArray(provider.provider_images)) {
                      imagesData.urls = provider.provider_images;
                    } else if (
                      typeof provider.provider_images === 'object' &&
                      provider.provider_images !== null &&
                      'urls' in provider.provider_images
                    ) {
                      imagesData = provider.provider_images;
                    }
                    if (imagesData.urls && imagesData.urls.length > 0) {
                      return imagesData.urls[0];
                    }
                  } catch {
                    return '/images/placeholder.jpg';
                  }
                  return '/images/placeholder.jpg';
                })()}
                title={provider.provider_name}
                onClick={() => router.push(detailPath)}
                onUnsave={() => handleUnsave(provider.provider_id, isCommunityService)}
              />
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
