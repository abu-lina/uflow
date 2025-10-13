'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/PageHeader';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { SearchBar } from '@/features/search/components/SearchBar';
import { EmptyState } from '@/components/ui';
import { useContainerScroll } from '@/hooks/useContainerScroll';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import { deleteBookmark } from '@/services/bookmarks';
import { getAllBookmarkedItems, fetchBookmarkedCities, type Provider } from '@/services/providers';
import { getFirstImageUrl, formatProviderAddress } from '@/utils/imageUtils';

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

  // Fetch cities from bookmarked items
  const { data: bookmarkedCities = [] } = useQuery({
    queryKey: ['bookmarked-cities', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await fetchBookmarkedCities(user.id);
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
      if (selectedLocation === 'Online') {
        // Filter for online businesses (no city)
        filtered = filtered.filter((provider) => 
          !provider.address_city || provider.address_city.trim() === ''
        );
      } else {
        // Filter for specific city
        filtered = filtered.filter((provider) => 
          provider.address_city?.toLowerCase() === selectedLocation.toLowerCase()
        );
      }
    }

    return filtered;
  }, [providers, searchQuery, selectedLocation]);

  const handleUnsave = useCallback(async (providerId: string, isCommunityService: boolean) => {
    if (!user) return;
    
    try {
      const bookmarkableType = isCommunityService ? 'community_service' : 'provider';
      
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
        
        // Optimistically update both caches
        queryClient.setQueryData(['saved-providers', user.id], (old: Provider[] = []) => 
          old.filter((s) => s.provider_id !== providerId)
        );
        
        queryClient.setQueryData(['bookmarks', user.id], (old: string[] = []) =>
          old.filter((id) => id !== providerId)
        );
      }
    } catch (err) {
      console.error('Fehler beim Entfernen des Items:', err);
    }
  }, [user, queryClient]);

  // SearchBar callbacks - no-ops since filtering is handled by context
  const handleSearchSubmit = useCallback(() => {
    // Filtering happens automatically via useMemo
  }, []);

  const handleClearSearch = useCallback(() => {
    // Clearing is handled by SearchBar updating context
  }, []);

  const handleCategoryChange = useCallback(() => {
    // Category changes handled by SearchBar updating context
  }, []);

  const handleLocationChange = useCallback(() => {
    // Location changes handled by SearchBar updating context
  }, []);

  const handleProviderClick = useCallback((providerId: string, isCommunityService: boolean) => {
    const detailPath = isCommunityService 
      ? `/community-services/${providerId}`
      : `/providers/${providerId}`;
    router.push(detailPath);
  }, [router]);

  // Render helpers
  const renderEmptyState = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center gap-6">
          <EmptyState
            description="Du musst angemeldet sein, um gespeicherte Inhalte zu sehen."
            title="Anmeldung erforderlich"
          />
          <button
            className="w-full max-w-[280px] rounded-xl bg-primary px-6 py-4 font-semibold text-base text-white transition-colors hover:bg-primary-dark"
            type="button"
            onClick={() => router.push('/login')}
          >
            Zur Anmeldung
          </button>
        </div>
      );
    }

    if (providers.length === 0) {
      return (
        <EmptyState
          description="Du hast noch keine Anbieter gespeichert. Speichere Anbieter, um sie hier zu sehen."
          title="Keine gespeicherten Anbieter"
        />
      );
    }

    if (filteredProviders.length === 0) {
      return (
        <EmptyState
          description="Keine Anbieter entsprechen deinen Suchkriterien."
          title="Keine Ergebnisse"
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Lädt...</p>
      </div>
    );
  }

  const emptyState = renderEmptyState();
  
  if (emptyState) {
    return (
      <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
        <PageHeader title="Gespeichert" />
        <main className="flex flex-1 flex-col items-center justify-center px-4 mobile-nav-spacing">
          {emptyState}
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      <PageHeader 
        isVisible={isHeaderVisible}
        title="Gespeichert"
      />

      <div className={`transition-all duration-300 ${isHeaderVisible ? 'h-[calc(env(safe-area-inset-top)+24px+40px)]' : 'h-0'}`} />

      <main className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <section className="w-full mb-6">
          <SearchBar 
            customCities={bookmarkedCities}
            hideCategoryFilter={true}
            onCategoryChange={handleCategoryChange}
            onClearSearch={handleClearSearch}
            onLocationChange={handleLocationChange}
            onSearchSubmit={handleSearchSubmit}
          />
        </section>
        
        <section className="grid w-full grid-cols-2 gap-4">
          {filteredProviders.map((provider) => {
            const isCommunityService = !!provider.community_service_id;
            const imageUrl = getFirstImageUrl(provider.provider_images);
            const address = formatProviderAddress(provider.address_street, provider.address_city);
            
            return (
              <SelectableCard
                key={provider.provider_id}
                actionType="unsave"
                bottomText={address}
                category={provider.category?.name_de || ''}
                imageUrl={imageUrl}
                title={provider.provider_name}
                onAction={() => handleUnsave(provider.provider_id, isCommunityService)}
                onClick={() => handleProviderClick(provider.provider_id, isCommunityService)}
              />
            );
          })}
        </section>
      </main>
    </div>
  );
}
