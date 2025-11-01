'use client';

import { useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// Material Symbols icon imports removed - using @iconify/react Icon component instead

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { SearchBar } from '@/features/search/components/SearchBar';
import { EmptyState, Button, IconWithTitle, Icon } from '@/components/ui';
import { useContainerScroll } from '@/hooks/useContainerScroll';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import { deleteBookmark } from '@/services/bookmarks';
import { getAllBookmarkedItems, fetchBookmarkedCities } from '@/services/providers';
import { getFirstImageUrl, formatProviderAddress } from '@/utils/imageUtils';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SavedProvidersPage() {
  const { user, isLoading: userLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchQuery, selectedLocation } = useSearch();
  const { isHeaderVisible } = useContainerScroll();
  const { t } = useLanguage();

  // Use React Query for all bookmarked items (providers + community services)
  // Show cached data immediately while refetching in background
  const { data: providers = [], isLoading, error: queryError } = useQuery({
    queryKey: ['saved-providers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await getAllBookmarkedItems(user.id);
      } catch (error) {
        console.error('Error loading saved items:', error);
        throw error;
      }
    },
    enabled: !!user && !userLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    // Show cached data immediately while refetching
    placeholderData: (previousData) => previousData,
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

  // Listen for bookmark change events to refresh the saved list
  useEffect(() => {
    const handleBookmarkChange = () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['saved-providers', user.id] });
        queryClient.invalidateQueries({ queryKey: ['bookmarked-cities', user.id] });
      }
    };

    window.addEventListener('bookmark-changed', handleBookmarkChange);
    return () => window.removeEventListener('bookmark-changed', handleBookmarkChange);
  }, [user, queryClient]);

  // Filter providers based on search query and location
  const filteredProviders = useMemo(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((provider) => {
        const nameMatch = provider.name?.toLowerCase().includes(query);
        const addressMatch = 
          provider.address_street?.toLowerCase().includes(query) ||
          provider.address_city?.toLowerCase().includes(query);
        const categoryMatch = provider.category?.name_de?.toLowerCase().includes(query);
        return nameMatch || addressMatch || categoryMatch;
      });
    }

    // Filter by location
    // Handle both German ("Überall") and English ("Everywhere") for "all locations"
    const isAllLocations = selectedLocation === 'Überall' || selectedLocation === 'Everywhere' || !selectedLocation;
    
    if (selectedLocation && !isAllLocations) {
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
        queryClient.setQueryData(['saved-providers', user.id], (old: typeof providers = []) => 
          old.filter((s) => s.id !== providerId)
        );
        
        queryClient.setQueryData(['bookmarks', user.id], (old: string[] = []) =>
          old.filter((id) => id !== providerId)
        );
      }
    } catch (err) {
      console.error(t('saved.errorRemovingItem'), err);
    }
  }, [user, queryClient, t]);

  const handleProviderClick = useCallback((providerId: string, isCommunityService: boolean) => {
    const detailPath = isCommunityService 
      ? `/community-services/${providerId}`
      : `/providers/${providerId}`;
    router.push(detailPath);
  }, [router]);

  // Render empty state based on current state
  const renderEmptyState = () => {
    if (!user) {
      return 'login_required';
    }

    if (providers.length === 0) {
      return 'no_saved_items';
    }

    if (filteredProviders.length === 0) {
      return 'no_results';
    }

    return null;
  };

  const emptyStateType = renderEmptyState();

  // Loading state: only show on true initial load (no cached data)
  // isLoading is true only when there's no cached data AND currently fetching
  if (isLoading) {
    return (
      <PageLayout hasBackground={false} maxWidth="full">
        <PageHeader title={t('saved.title')} variant="title-only" />
        <HeaderSpacer />
        <PageContentWrapper centerVertically={true} maxWidth="full" padding="lg-safe">
          <p className="text-lg text-gray-500 text-center">{t('saved.loading') || 'Loading...'}</p>
        </PageContentWrapper>
      </PageLayout>
    );
  }

  // Error state
  if (queryError) {
    return (
      <PageLayout hasBackground={false} maxWidth="full">
        <PageHeader title={t('saved.title')} variant="title-only" />
        <HeaderSpacer />
        <PageContentWrapper centerVertically={true} maxWidth="full" padding="lg-safe">
          <EmptyState
            description={t('saved.errorLoadingDescription') || 'Failed to load your saved items. Please try again.'}
            title={t('saved.errorLoading') || 'Error loading saved items'}
          />
        </PageContentWrapper>
      </PageLayout>
    );
  }

  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader 
        isVisible={isHeaderVisible}
        title={t('saved.title')}
        variant="title-only"
      />

      <HeaderSpacer isVisible={isHeaderVisible} />

      <PageContentWrapper 
        centerVertically={!!emptyStateType}
        maxWidth="full"
        padding="lg-safe"
      >
        {emptyStateType === 'login_required' ? (
          <>
            <TitleSection className="mb-10">
              <IconWithTitle
                icon={<Icon className="w-full h-full text-content-title" icon="material-symbols:lock-outline" />}
                size="large"
                title={t('saved.loginRequired')}
              >
                <p className="text-center text-base leading-normal text-content mt-2">
                  {t('saved.loginDescription')}
                </p>
              </IconWithTitle>
            </TitleSection>
            <ContentSection>
              <Button
                fullWidth
                type="button"
                variant="auth"
                onClick={() => router.push('/login')}
              >
                {t('saved.goToLogin')}
              </Button>
            </ContentSection>
          </>
        ) : emptyStateType === 'no_saved_items' ? (
          <EmptyState
            description={t('saved.noSavedProvidersDescription')}
            title={t('saved.noSavedProviders')}
          />
        ) : emptyStateType === 'no_results' ? (
          <EmptyState
            description={t('saved.noResultsDescription')}
            title={t('saved.noResults')}
          />
        ) : (
          <>
            <SearchBar 
              customCities={bookmarkedCities}
              hideCategoryFilter={true}
            />
            
            <ul 
              aria-label={t('saved.savedItemsList') || 'Saved items'}
              className="grid w-full grid-cols-2 gap-4 mt-6"
              role="list"
            >
              {filteredProviders.map((provider) => {
                const isCommunityService = provider.type === 'community_service';
                const imageUrl = getFirstImageUrl(provider.images);
                const address = formatProviderAddress(provider.address_street, provider.address_city);
                
                return (
                  <li key={provider.id}>
                    <SelectableCard
                      actionType="unsave"
                      bottomText={address}
                      category={provider.category?.name_de || ''}
                      imageUrl={imageUrl}
                      title={provider.name}
                      onAction={() => handleUnsave(provider.id, isCommunityService)}
                      onClick={() => handleProviderClick(provider.id, isCommunityService)}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </PageContentWrapper>
    </PageLayout>
  );
}
