'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { SectionSelector } from '@/features/search/components/SectionSelector';
import { DiscoveryFilterBar } from '@/features/search/components/DiscoveryFilterBar';
import { DiscoveryResultsGrid, type DiscoveryCardItem } from '@/features/search/components/DiscoveryResultsGrid';
import { DiscoveryHeader } from '@/features/search/components/DiscoveryHeader';
import { useNearMe } from '@/features/search/hooks/useNearMe';
import { useMapDiscovery } from '@/features/search/hooks/useMapDiscovery';
import { ViewToggleButton } from '@/features/search/components/ViewToggleButton';
import { HomeSearchInput } from '@/features/search/components/HomeSearchInput';
import { useGeolocation } from '@/hooks/useGeolocation';
import { filterOpenNow } from '@/utils/filterOpenNow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { supabase } from '@/lib/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AdminStatusFilter, type ReviewStatusFilter } from '@/features/admin/components/AdminStatusFilter';
import { toast } from 'sonner';
import { useProviderReview } from '@/features/admin/hooks/useProviderReview';
import { RejectModal } from '@/features/admin/components/RejectModal';
import { LegalLinksModal } from '@/components/shared/LegalLinksModal';

import { useSearch, LOCATION_ALL } from '@/providers/search-provider';
import type { Section } from '@/providers/search-provider';
import { getResultsPathForSection, resolveSectionFromRoute } from '@/config/sectionFilters';
import type { SearchResult, NearMeFoodResult } from '@/services/providers';
import { SEARCH_FILTER_KEY_SET, type SearchFilterKey } from '@/features/search/constants/filterKeys';

const SearchMap = dynamic(
  () => import('@/features/search/components/SearchMap').then((mod) => mod.SearchMap),
  { ssr: false },
);

const DEFAULT_RADIUS_KM = 5;

/**
 * Fetch search results from the server-side route handler.
 * Used for pagination after the initial server-rendered page.
 *
 * Plan 010 — P1a: Server boundary for pagination
 * Plan 058 — Admin status filter support
 */
async function fetchProvidersFromAPI(
  query: string,
  category: string | null,
  location: string,
  page: number,
  pageSize: number,
  status?: ReviewStatusFilter,
  section?: Section,
  filters?: SearchFilterKey[],
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (location) params.set('location', location);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  // Plan 058: Include status filter for admin users
  if (status) params.set('status', status);
  // Plan 089: Include section filter
  if (section) params.set('section', section);
  if (filters && filters.length > 0) params.set('filters', filters.join(','));

  const response = await fetch(`/api/providers/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }
  return response.json();
}

interface ProvidersContentProps {
  defaultLocation?: string; // For Stage 2: render on root with city filter
  showGreeting?: boolean; // Show greeting header instead of search bar and category filter
  /** Server-rendered initial data for the first page of results (Plan 010 P1a) */
  initialData?: { results: SearchResult[]; hasMore: boolean };
  initialFilters?: SearchFilterKey[];
}

export function ProvidersContent({
  defaultLocation,
  showGreeting = false,
  initialData,
  initialFilters,
}: ProvidersContentProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Plan 058: Provider review hook and modal state for admin moderation
  const { approveProvider, rejectProvider, isLoading: isReviewLoading, reviewingProviderId } = useProviderReview();
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    providerId: string | null;
    providerName: string;
  }>({ isOpen: false, providerId: null, providerName: '' });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get search context to sync with URL parameters
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedLocation,
    setSelectedLocation,
    selectedSection,
    setSelectedSection,
  } = useSearch();

  // Plan 089 M8: Infer section from URL params with legacy URL support
  // Priority: ?section= > infer from ?category= (only when category param IS present) > default 'food' (D9)
  const section = resolveSectionFromRoute(pathname, new URLSearchParams(searchParams.toString()));

  // Resolve the location for use as a query transport value (not for display).
  // searchParams.get('location') returns null when absent, '' when ?location= is present.
  // We must NOT use || here because '' is a valid sentinel (LOCATION_ALL) and would be
  // discarded as falsy, causing it to fall through to a localized display label.
  // Mirror the same normalization that page.tsx applies server-side (Plan 044).
  const rawLocationParam = searchParams.get('location'); // null | string
  const normalizedUrlLocation =
    rawLocationParam === null
      ? LOCATION_ALL // param absent → all locations (never fall through to context)
      : rawLocationParam === 'Everywhere' || rawLocationParam === 'Überall'
        ? LOCATION_ALL // legacy all-locations labels → LOCATION_ALL sentinel
        : rawLocationParam; // real city name or '' (LOCATION_ALL)
  // Priority: defaultLocation > URL param ('' preserved) > LOCATION_ALL ('')
  // URL is sole source of truth. Context is never used as fallback for location.
  const location = defaultLocation ?? normalizedUrlLocation;
  const query = searchParams.get('q') || '';

  // URL param is the canonical source of truth for category filter.
  // Context (selectedCategory) is only used as fallback when the URL param is absent,
  // preventing stale context from overriding navigation to a different category UUID.
  const category = (searchParams.get('category') || null) ?? selectedCategory;

  // Plan 058: Admin status filter from URL params
  // Only applied when user is admin (non-admins can't use status filter)
  const statusParam = searchParams.get('status') as ReviewStatusFilter;
  const status = isAdmin ? statusParam : null;
  const rawFilters = searchParams.get('filters') || '';
  const filters = rawFilters
    .split(',')
    .map((key) => key.trim())
    .filter((key): key is SearchFilterKey => SEARCH_FILTER_KEY_SET.has(key));
  const normalizedFilters = filters.length > 0 ? filters : undefined;
  const hasMatchingInitialFilters =
    (initialFilters ?? []).join(',') === (normalizedFilters ?? []).join(',');

  // Plan 220: Near-me state — geolocation-based (matches home page pattern)
  const [nearMeActive, setNearMeActive] = useState(false);

  const geolocation = useGeolocation();

  // Shared map/discovery state: pins, view mode, open-now, header metrics
  const {
    pins, isOpenNow, setIsOpenNow, viewMode,
    toggleViewMode, headerRef, headerHeight, userCoords,
  } = useMapDiscovery(geolocation, 'list', isAdmin ? status : null);

  const nearMe = useNearMe({
    coords: userCoords,
    active: nearMeActive && viewMode === 'list',
    openNow: isOpenNow,
    radiusKm: DEFAULT_RADIUS_KM,
    urlSync: false,
  });

  const handleToggleNearMe = () => {
    if (nearMeActive || geolocation.status === 'granted') {
      setNearMeActive(false);
      geolocation.reset();
      return;
    }
    setNearMeActive(true);
    geolocation.requestLocation();
  };

  // Use React Query infinite query for paginated search results
  // Page size: 12 provides good balance between initial load and frequent pagination
  const PAGE_SIZE = 12;

  // Plan 058 + 089: Include status and section in query key for proper cache management
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['providers', query, category, location, status, section, normalizedFilters?.join(',') ?? ''],
      queryFn: ({ pageParam = 0 }) =>
        fetchProvidersFromAPI(query, category, location, pageParam, PAGE_SIZE, status, section, normalizedFilters),
      getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
      initialPageParam: 0,
      // Use server-rendered initial data when available (Plan 010 P1a)
      // Note: initialData only applies when no status filter is active
      ...(!status && initialData && hasMatchingInitialFilters && {
        initialData: {
          pages: [initialData],
          pageParams: [0],
        },
      }),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data for 10 min
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnMount: false, // Use cached data if available
      retry: 2, // Retry failed requests 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      // Show cached data immediately while refetching in background
      placeholderData: (previousData) => previousData,
      // Plan 196: Skip the paginated text/category search entirely while "near me" is active.
      enabled: !nearMe.isActive,
    });

  // Flatten all pages into a single array — memoized so stable reference for useCallback deps.
  // Plan 196 bug fix: apply the "Open now" filter here too, so it takes effect
  // even when "Near me" is not active.
  const searchResults = useMemo(
    () => filterOpenNow(data?.pages.flatMap((page) => page.results) ?? [], isOpenNow),
    [data, isOpenNow],
  );

  // Use React Query for bookmarks - includes both providers and community services
  const { data: bookmarkedProviderIds = [] } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all bookmarks (providers and community services)
      const { data: bookmarks, error } = await supabase
        .from('bookmarks')
        .select('provider_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
      }

      // Return all bookmarked IDs (both providers and community services)
      return bookmarks?.map((b) => b.provider_id).filter((id): id is string => !!id) || [];
    },
    enabled: !!user && !userLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Memoized event handlers with optimistic updates
  const handleBookmarkChange = useCallback(
    (providerId: string, isBookmarked: boolean) => {
      // Optimistically update the cache
      queryClient.setQueryData(['bookmarks', user?.id], (old: string[] = []) => {
        if (isBookmarked) {
          return [...old, providerId];
        }
        return old.filter((id) => id !== providerId);
      });
    },
    [queryClient, user?.id],
  );

  const handleSectionChange = useCallback(
    (nextSection: Section) => {
      if (nextSection === section) return;
      const params = new URLSearchParams(window.location.search);
      params.set('section', nextSection);
      params.delete('category');
      const nextPath = getResultsPathForSection(nextSection);
      router.replace(`${nextPath}?${params.toString()}`, { scroll: false });
    },
    [section, router],
  );

  // Plan 058: Handle admin status filter change - update URL with new status
  const handleStatusChange = useCallback(
    (newStatus: ReviewStatusFilter) => {
      const params = new URLSearchParams(window.location.search);
      if (newStatus) {
        params.set('status', newStatus);
      } else {
        params.delete('status');
      }
      const resolvedSection = resolveSectionFromRoute(pathname, params);
      params.set('section', resolvedSection);
      router.replace(`${getResultsPathForSection(resolvedSection)}?${params.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  // Plan 058: Handle admin approve action
  const handleApprove = useCallback(
    async (providerId: string) => {
      try {
        await approveProvider(providerId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve provider. Please try again.';
        console.error('[handleApprove] Failed to approve provider:', message);
        toast.error(message);
      }
    },
    [approveProvider],
  );

  // Plan 058: Handle admin reject action - open modal to collect feedback
  const handleRejectClick = useCallback(
    (providerId: string) => {
      // Find provider name from search results for modal display
      const provider = searchResults.find((r) => r.id === providerId);
      setRejectModalState({
        isOpen: true,
        providerId,
        providerName: provider?.name || 'Provider',
      });
    },
    [searchResults],
  );

  // Plan 059/062: Handle reject confirmation from modal (feedback is now required)
  const handleRejectConfirm = useCallback(
    async (feedback: string) => {
      if (rejectModalState.providerId) {
        try {
          await rejectProvider(rejectModalState.providerId, feedback);
          setRejectModalState({ isOpen: false, providerId: null, providerName: '' });
        } catch (err) {
          console.error('[handleRejectConfirm] Failed to reject provider:', err);
          toast.error('Failed to reject provider. Please try again.');
        }
      }
    },
    [rejectModalState.providerId, rejectProvider],
  );

  // Plan 058: Handle reject modal close
  const handleRejectModalClose = useCallback(() => {
    setRejectModalState({ isOpen: false, providerId: null, providerName: '' });
  }, []);

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
    // Sync location using the already-resolved `location` value (resolved via ?? chain above:
    // defaultLocation ?? normalizedUrlLocation ?? selectedLocation ?? LOCATION_ALL).
    // Using `??` semantics here ensures an empty-string LOCATION_ALL is respected rather than
    // discarded — the same pattern applied in the RC-1 fix (Plan 044).
    if (location !== selectedLocation) {
      setSelectedLocation(location);
    }
    // Plan 089: Sync section from URL
    if (section !== selectedSection) {
      setSelectedSection(section);
    }
    // ESLint warning is intentionally ignored here to prevent infinite loops
    // The setter functions are stable and don't need to be in dependencies
    // Including searchQuery, selectedCategory, selectedLocation would cause infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, location, defaultLocation, section]); // Include defaultLocation to sync when it changes

  // Prefetch likely next pages after initial load (performance optimization)
  useEffect(() => {
    // Only prefetch if user is logged in and page has loaded
    if (user && !isLoading && !userLoading) {
      // Prefetch profile and saved pages user is likely to visit
      router.prefetch('/profile');
      router.prefetch('/saved');
    }
  }, [user, isLoading, userLoading, router]);

  // Plan 221: Adapter functions to convert results to DiscoveryCardItem shape
  function adaptNearMeResult(result: NearMeFoodResult): DiscoveryCardItem {
    return {
      id: result.provider_id,
      provider_id: result.provider_id,
      provider_name: result.provider_name,
      provider_images: result.provider_images,
      category: result.category_name_de
        ? { name_de: result.category_name_de, name_en: result.category_name_en ?? undefined, category_images: result.category_images ?? undefined }
        : null,
      category_id: result.category_id,
      address_city: result.address_city,
      opening_hours: result.opening_hours,
      listing_type: 'food',
      location_latitude: result.location_latitude,
      location_longitude: result.location_longitude,
      distanceKm: result.distance_km,
      isBookmarked: bookmarkedProviderIds.includes(result.provider_id),
    };
  }

  function adaptSearchResultToDiscoveryItem(result: SearchResult): DiscoveryCardItem {
    return {
      id: result.id,
      provider_id: result.id,
      provider_name: result.name,
      provider_images: result.images,
      category: result.category ?? null,
      category_id: result.category_id,
      address_city: result.address_city,
      address_street: result.address_street,
      address_zip: result.address_zip,
      address_country: result.address_country,
      contact_email: result.contact_email,
      contact_phone: result.contact_phone,
      created_at: result.created_at,
      updated_at: result.updated_at,
      offers_ids: result.offers_ids,
      needs_ids: result.needs_ids,
      opening_hours: result.opening_hours ?? result.originalProvider?.opening_hours ?? null,
      listing_type: result.listing_type,
      location_latitude: result.location_latitude,
      location_longitude: result.location_longitude,
      social_website: result.social_website,
      social_instagram: result.social_instagram,
      badges: result.badges,
      offers: result.offers,
      verification_method: result.originalProvider?.verification_method,
      has_certificate: result.originalProvider?.has_certificate,
      review_status: status,
      review_feedback: result.review_feedback,
      isBookmarked: bookmarkedProviderIds.includes(result.id),
    };
  }

  // Render content based on state
  const enableModeration = isAdmin && !!status && section !== 'ummah';

  const renderContent = () => {
    // Plan 196: "Near me" takes over rendering entirely
    if (nearMe.isActive) {
      return (
        <DiscoveryResultsGrid
          enableBookmarks
          enableDistance
          error={nearMe.error}
          headerOffset={headerHeight}
          isLoading={nearMe.isLoading}
          items={nearMe.results.map(adaptNearMeResult)}
          openNow={isOpenNow}
          onRetry={nearMe.refetch}
        />
      );
    }

    if (isLoading) {
      return <SkeletonGrid count={12} />;
    }

    if (error) {
      console.error('[ProvidersContent] Search error:', error);
      return (
        <EmptyState description={t('providers.errorLoading')} title={t('providers.errorTitle')} />
      );
    }

    if (searchResults.length === 0) {
      return (
        <EmptyState
          description={t('providers.noResultsDescription')}
          title={t('providers.noResultsFound')}
        />
      );
    }

    return (
      <DiscoveryResultsGrid
        enableBookmarks
        enableInfiniteScroll
        bookmarkedIds={bookmarkedProviderIds}
        enableModeration={enableModeration}
        error={error}
        hasNextPage={hasNextPage ?? false}
        headerOffset={headerHeight}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={false}
        items={searchResults.map(adaptSearchResultToDiscoveryItem)}
        openNow={isOpenNow}
        reviewingProviderId={reviewingProviderId}
        onApprove={handleApprove}
        onBookmarkChange={handleBookmarkChange}
        onLoadMore={fetchNextPage}
        onReject={handleRejectClick}
        onRetry={() => refetch()}
      />
    );
  };

  // Info icon portal - render at document root to avoid clipping (only for Stage 2)
  // Positioned directly below the LanguageSwitcher on the right side (no gap), right-aligned
  // z-index lower than LanguageSwitcher to ensure dropdown appears above it
  const infoIconPortal =
    showGreeting && isMounted && typeof document !== 'undefined' && document.body
      ? createPortal(
          <div
            className="fixed right-2 top-10 z-[9998] sm:hidden"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
              paddingRight: 'max(env(safe-area-inset-right), 0.25rem)',
            }}
          >
            <button
              aria-label={t('legal.legalInfo') || 'Legal information'}
              className="ml-auto flex items-center justify-center rounded-lg bg-gray-100 p-1.5 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              type="button"
              onClick={() => setShowLegalModal(true)}
            >
              <Icon className="h-5 w-5 text-content-heading" icon="lucide:info" />
            </button>
          </div>,
          document.body,
        )
      : null;

  // Language switcher portal - render at document root to avoid clipping (only for Stage 2)
  const languageSwitcherPortal =
    showGreeting && isMounted && typeof document !== 'undefined' && document.body
      ? createPortal(
          <div
            className="fixed right-2 top-2 z-[9999] sm:hidden"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 0.25rem)',
              paddingRight: 'max(env(safe-area-inset-right), 0.25rem)',
            }}
          >
            <LanguageSwitcher variant="dropdown" />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {infoIconPortal}
      {languageSwitcherPortal}
      <LegalLinksModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} />
      {/* Plan 058: Reject modal for admin provider review */}
      <RejectModal
        isLoading={isReviewLoading}
        isOpen={rejectModalState.isOpen}
        providerName={rejectModalState.providerName}
        onClose={handleRejectModalClose}
        onConfirm={handleRejectConfirm}
      />
      {showGreeting ? (
        // Fixed greeting header for Stage 2 (matches DiscoveryHeader style)
        <header
          className="fixed left-0 right-0 top-0 z-50 sm:hidden"
          style={{
            transition:
              'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
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
            className="px-4 py-4"
            style={{
              paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
            }}
          >
            <div className="pb-3">
              <SectionSelector
                selectedSection={section}
                onSectionChange={handleSectionChange}
              />
            </div>
            <div className="mx-auto max-w-72">
              <MobileGreetingHeader cityName={defaultLocation} />
            </div>
          </div>
        </header>
      ) : (
        <DiscoveryHeader
          ref={headerRef}
          filterBarSlot={
            section === 'food' ? (
              <DiscoveryFilterBar
                adminSlot={
                  isAdmin ? (
                    <AdminStatusFilter selectedStatus={status} onStatusChange={handleStatusChange} />
                  ) : undefined
                }
                geoStatus={geolocation.status}
                nearMeActive={nearMeActive}
                openNowActive={isOpenNow}
                onToggleNearMe={handleToggleNearMe}
                onToggleOpenNow={() => setIsOpenNow((v) => !v)}
              />
            ) : undefined
          }
          searchSlot={<HomeSearchInput activeSection={section} />}
          section={section}
          selectedSection={section}
          viewMode={viewMode}
          onSectionChange={handleSectionChange}
        />
      )}

      <main
        className={`mobile-nav-spacing mx-auto min-h-full w-full max-w-screen-xl overflow-x-hidden ${
          showGreeting
            ? 'pt-0 sm:pt-0 md:pt-[153px]'
            : 'pt-0 sm:pt-0 md:pt-[153px]'
        }`}
      >
        {!showGreeting && section === 'food' && (
          <div
            style={{
              visibility: viewMode === 'map' ? 'visible' : 'hidden',
              position: 'absolute',
              inset: 0,
            }}
          >
            <SearchMap
              pins={pins}
              userCoords={userCoords}
            />
          </div>
        )}

        {viewMode === 'list' && renderContent()}

        {/* Toggle button: map <-> list, sits above navbar — food results only */}
        {!showGreeting && section === 'food' && (
          <ViewToggleButton viewMode={viewMode} onToggle={toggleViewMode} />
        )}
      </main>
    </>
  );
}
