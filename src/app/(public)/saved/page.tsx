'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { CreatedProviderCard } from '@/components/shared/CreatedProviderCard';
import { SearchBar } from '@/features/search/components/SearchBar';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import { getBookmarkForProvider, deleteBookmark } from '@/services/bookmarks';
import { getBookmarkedProviders, type Provider } from '@/services/providers';

export default function SavedProvidersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchQuery, selectedLocation } = useSearch();

  // Use React Query for bookmarked providers with caching
  const { data: providers = [], isLoading: loading } = useQuery({
    queryKey: ['saved-providers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getBookmarkedProviders(user.id);
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

  const handleUnsave = async (providerId: string) => {
    if (!user) return;
    try {
      const bookmark = await getBookmarkForProvider(providerId, user.id);
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
      console.error('Fehler beim Entfernen des Providers:', err);
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
        {/* Sticky Header */}
        <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top">
          <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
            {/* Left-aligned Title */}
            <h1 className="text-xl font-semibold text-content-title">
              Gespeichert
            </h1>
          </div>
        </div>

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
      {/* Sticky Header */}
      <div className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top">
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Left-aligned Title */}
          <h1 className="text-xl font-semibold text-content-title">
            Gespeichert
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center px-4 pt-20 mobile-nav-spacing overflow-y-auto">
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
          filteredProviders.map((provider) => (
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
              onClick={() => router.push(`/providers/${provider.provider_id}`)}
              onUnsave={() => handleUnsave(provider.provider_id)}
            />
          ))
        )}
        </div>
      </div>
    </div>
  );
}
