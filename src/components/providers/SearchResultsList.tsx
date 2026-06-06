'use client';

import { useEffect, useRef, useCallback, memo, useMemo } from 'react';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { usePrefetchProvider } from '@/hooks/useProvider';
import type { SearchResult, Provider, ReviewStatusFilter } from '@/services/providers';

interface SearchResultsListProps {
  searchResults: SearchResult[];
  bookmarkedProviderIds: string[];
  onProviderClick: (provider: Provider) => void;
  onBookmarkChange: (providerId: string, isBookmarked: boolean) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore: () => void;
  error?: Error | null;
  onRetry?: () => void;
  /** Plan 058: Card mode - 'bookmark' (default) or 'moderation' for admin review */
  mode?: 'bookmark' | 'moderation';
  /** Plan 058: Callback when admin approves a provider */
  onApprove?: (providerId: string) => void;
  /** Plan 058: Callback when admin rejects a provider */
  onReject?: (providerId: string) => void;
  /** Plan 058: ID of provider currently being reviewed (loading state) */
  reviewingProviderId?: string | null;
}

export const SearchResultsList = memo(function SearchResultsList({
  searchResults,
  bookmarkedProviderIds,
  onProviderClick,
  onBookmarkChange,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  error = null,
  onRetry,
  mode = 'bookmark',
  onApprove,
  onReject,
  reviewingProviderId,
}: SearchResultsListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const prefetchProvider = usePrefetchProvider();

  // Debounced load more handler to prevent rapid fire
  const debouncedLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Infinite scroll using Intersection Observer with debouncing
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          // Debounce to prevent rapid firing
          clearTimeout(timeoutId);
          timeoutId = setTimeout(debouncedLoadMore, 200);
        }
      },
      {
        rootMargin: '200px', // Trigger 200px before reaching the element for smoother UX
        threshold: 0.1,
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      clearTimeout(timeoutId);
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, debouncedLoadMore]);

  const filteredResults = useMemo(
    () => searchResults.filter((result) => result != null && result.id != null),
    [searchResults],
  );

  const searchResultToProvider = useCallback(
    (result: SearchResult): Provider => ({
      provider_id: result.id,
      provider_name: result.name,
      provider_images: result.images,
      category_id: result.category_id,
      address_city: result.address_city,
      social_website: result.social_website,
      social_instagram: result.social_instagram,
      contact_email: result.contact_email,
      contact_phone: result.contact_phone,
      address_street: result.address_street,
      address_country: result.address_country,
      address_zip: result.address_zip,
      location_latitude: result.location_latitude,
      location_longitude: result.location_longitude,
      created_at: result.created_at,
      updated_at: result.updated_at,
      badges: result.badges,
      offers_ids: result.offers_ids,
      needs_ids: result.needs_ids,
      offers: result.offers,
      listing_type: result.listing_type,
      muslim_owned: result.muslim_owned,
      has_prayer_space: result.has_prayer_space,
      family_friendly: result.family_friendly,
      women_friendly: result.women_friendly,
      children_friendly: result.children_friendly,
      makes_donations: result.makes_donations,
      has_parking: result.has_parking,
      economic_solidarity: result.economic_solidarity,
      verification_method: result.originalProvider?.verification_method,
      has_certificate: result.originalProvider?.has_certificate,
      no_alcohol: result.originalProvider?.no_alcohol,
      no_pork: result.originalProvider?.no_pork,
      no_gambling: result.originalProvider?.no_gambling,
      opening_hours: result.opening_hours ?? result.originalProvider?.opening_hours ?? null,
      category: result.category,
    }),
    [],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
        {filteredResults.map((result, index) => {
          const provider = searchResultToProvider(result);
          return (
            <div
              key={result.id}
              className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
              role="button"
              tabIndex={0}
              onClick={() => onProviderClick(provider)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onProviderClick(provider);
                }
              }}
              onMouseEnter={() => prefetchProvider(result.id)}
            >
              <ProviderCard
                {...provider}
                bookmarkableType={result.type}
                hideWebsiteButton={true}
                isBookmarked={bookmarkedProviderIds.includes(result.id)}
                isReviewing={reviewingProviderId === result.id}
                loading={index < 4 ? 'eager' : 'lazy'}
                mode={mode}
                priority={index < 4}
                reviewStatus={result.review_status as ReviewStatusFilter}
                onApprove={() => onApprove?.(result.id)}
                onBookmarkChange={(isBookmarked: boolean) =>
                  onBookmarkChange(result.id, isBookmarked)
                }
                onReject={() => onReject?.(result.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger - auto-loads as user approaches bottom */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-4 py-8">
          {isFetchingNextPage ? (
            // Show skeleton cards while loading (better perceived performance)
            <div className="grid w-full grid-cols-2 gap-3 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </div>
          ) : error ? (
            // Error state with retry option (only time we show a button)
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-danger">Fehler beim Laden weiterer Ergebnisse</p>
              {onRetry && (
                <Button size="sm" variant="primary" onClick={onRetry}>
                  Erneut versuchen
                </Button>
              )}
            </div>
          ) : (
            // Invisible sentinel element for intersection observer - triggers auto-load
            <div aria-hidden="true" className="h-1 w-full" />
          )}
        </div>
      )}
    </>
  );
});
