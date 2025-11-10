'use client';

import { useEffect, useRef, useCallback } from 'react';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { usePrefetchProvider } from '@/hooks/useProvider';
import type { SearchResult, Provider } from '@/services/providers';

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
}

export function SearchResultsList({
  searchResults,
  bookmarkedProviderIds,
  onProviderClick,
  onBookmarkChange,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  error = null,
  onRetry,
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
      }
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

  return (
    <>
    <div className="grid grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
      {searchResults.map((result) => {
        // Convert SearchResult back to Provider format for compatibility
        const provider: Provider = {
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
          barakah_effects: result.barakah_effects,
          offers_ids: result.offers_ids,
          needs_ids: result.needs_ids,
          category: result.category,
          community_service_id: result.type === 'community_service' ? result.id : undefined,
        };

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
            onMouseEnter={() => {
              // Prefetch provider data on hover for instant navigation
              prefetchProvider(result.id);
            }}
          >
            <ProviderCard
              {...provider}
              bookmarkableType={result.type}
              hideWebsiteButton={true}
              isBookmarked={bookmarkedProviderIds.includes(result.id)}
              onBookmarkChange={(isBookmarked: boolean) =>
                onBookmarkChange(result.id, isBookmarked)
              }
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
            <div className="grid w-full grid-cols-1 justify-items-center gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </div>
          ) : error ? (
            // Error state with retry option (only time we show a button)
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-red-500">
                Fehler beim Laden weiterer Ergebnisse
              </p>
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
}
