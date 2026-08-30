'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback, memo } from 'react';
import { ProviderCard } from '@/features/providers/components/ProviderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import type { ProviderBadgeWithType } from '@/types/badges';
import type { OpeningHours } from '@/types/openingHours';
import type { Location } from '@/types/location';
import type { ReviewStatusFilter } from '@/services/providers';

export interface DiscoveryCardItem {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_images: string | { urls?: string[] } | null;
  category?: {
    name_de: string;
    name_en?: string;
    category_images?: Record<string, unknown>;
  } | null;
  category_id: string | null;
  address_city: string | null;
  address_street?: string | null;
  address_zip?: string | null;
  address_country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  offers_ids?: string[];
  needs_ids?: string[];
  opening_hours?: OpeningHours | null;
  listing_type?: 'food' | 'store' | 'ummah' | null;
  distanceKm?: number;
  location_latitude?: number | null;
  location_longitude?: number | null;
  social_website?: string | null;
  social_instagram?: string | null;
  badges?: ProviderBadgeWithType[];
  locations?: Location[];
  offers?: Array<{ name_de: string }>;
  verification_method?: 'online' | 'onsite' | null;
  has_certificate?: boolean;
  review_status?: ReviewStatusFilter;
  review_feedback?: string | null;
  /** Bookmark state for this row (used when enableBookmarks is true). */
  isBookmarked?: boolean;
}

interface DiscoveryResultsGridProps {
  items: DiscoveryCardItem[];
  isLoading: boolean;
  error?: Error | null;
  headerOffset: number;
  openNow: boolean;
  /** Enables distance badge rendering when items carry distanceKm. */
  enableDistance?: boolean;
  /** Enables bookmark affordance and requires bookmarkedIds/onBookmarkChange. */
  enableBookmarks?: boolean;
  bookmarkedIds?: string[];
  onBookmarkChange?: (providerId: string, isBookmarked: boolean) => void;
  /** Enables moderation mode (Approve/Reject) and requires onApprove/onReject. */
  enableModeration?: boolean;
  onApprove?: (providerId: string) => void;
  onReject?: (providerId: string) => void;
  reviewingProviderId?: string | null;
  /** Enables infinite scroll and requires hasNextPage/isFetchingNextPage/onLoadMore. */
  enableInfiniteScroll?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  /** Optional custom empty title/description; defaults to map.noProviders. */
  emptyTitle?: string;
  emptyDescription?: string;
}

const SKELETON_COUNT = 8;

function itemToProviderCardProps(item: DiscoveryCardItem) {
  return {
    provider_id: item.provider_id,
    provider_name: item.provider_name,
    provider_images: item.provider_images,
    category: item.category ?? { name_de: '' },
    category_id: item.category_id,
    address_city: item.address_city,
    address_street: item.address_street ?? null,
    address_zip: item.address_zip ?? null,
    address_country: item.address_country ?? null,
    contact_email: item.contact_email ?? null,
    contact_phone: item.contact_phone ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    offers_ids: item.offers_ids ?? [],
    needs_ids: item.needs_ids ?? [],
    opening_hours: item.opening_hours ?? null,
    listing_type: item.listing_type ?? 'food',
    location_latitude: item.location_latitude ?? null,
    location_longitude: item.location_longitude ?? null,
    social_website: item.social_website ?? null,
    social_instagram: item.social_instagram ?? null,
    badges: item.badges,
    locations: item.locations,
    offers: item.offers,
    verification_method: item.verification_method,
    has_certificate: item.has_certificate,
    distanceKm: item.distanceKm,
    hideWebsiteButton: true,
  };
}

export const DiscoveryResultsGrid = memo(function DiscoveryResultsGrid({
  items,
  isLoading,
  error = null,
  headerOffset,
  openNow,
  enableDistance = true,
  enableBookmarks = false,
  bookmarkedIds = [],
  onBookmarkChange,
  enableModeration = false,
  onApprove,
  onReject,
  reviewingProviderId,
  enableInfiniteScroll = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onRetry,
  emptyTitle,
  emptyDescription,
}: DiscoveryResultsGridProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const debouncedLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && onLoadMore) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  useEffect(() => {
    if (!enableInfiniteScroll) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(debouncedLoadMore, 200);
        }
      },
      {
        rootMargin: '200px',
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
  }, [enableInfiniteScroll, hasNextPage, isFetchingNextPage, debouncedLoadMore]);

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[21] overflow-y-auto bg-uflow-light"
        style={{ paddingTop: headerOffset }}
      >
        <div className="px-4 pt-3">
          <SkeletonGrid count={SKELETON_COUNT} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="fixed inset-0 z-[21] flex flex-col items-center justify-center bg-uflow-light px-6 text-center"
        style={{ paddingTop: headerOffset }}
      >
        <EmptyState
          description={t('suchen.nearMe.errorLoading')}
          title={t('suchen.nearMe.errorTitle')}
        />
        {onRetry && (
          <button
            className="mt-2 font-inter-tight text-sm font-medium text-primary underline underline-offset-2"
            type="button"
            onClick={onRetry}
          >
            {t('suchen.nearMe.retry')}
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[21] flex flex-col items-center justify-center bg-uflow-light px-6 text-center"
        style={{ paddingTop: headerOffset }}
      >
        <EmptyState
          description={emptyDescription ?? (openNow ? t('map.noOpenProvidersHint') : t('map.noProvidersHint'))}
          title={emptyTitle ?? (openNow ? t('map.noOpenProviders') : t('map.noProviders'))}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[21] overflow-y-auto bg-uflow-light"
      style={{
        paddingTop: headerOffset,
        paddingBottom: 'calc(64px + 1rem + max(12px, env(safe-area-inset-bottom)))',
      }}
    >
      <div className="grid grid-cols-2 gap-3 px-4 pt-3 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/providers/${item.provider_id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/providers/${item.provider_id}`);
              }
            }}
          >
            <ProviderCard
              {...itemToProviderCardProps(item)}
              isBookmarked={enableBookmarks ? bookmarkedIds.includes(item.provider_id) : undefined}
              mode={enableModeration ? 'moderation' : 'bookmark'}
              reviewStatus={enableModeration ? item.review_status : undefined}
              isReviewing={reviewingProviderId === item.provider_id}
              onBookmarkChange={
                enableBookmarks && onBookmarkChange
                  ? (isBookmarked) => onBookmarkChange(item.provider_id, isBookmarked)
                  : undefined
              }
              onApprove={
                enableModeration && onApprove ? () => onApprove(item.provider_id) : undefined
              }
              onReject={
                enableModeration && onReject ? () => onReject(item.provider_id) : undefined
              }
            />
          </div>
        ))}
      </div>

      {enableInfiniteScroll && hasNextPage && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-4 py-8">
          {isFetchingNextPage ? (
            <div className="grid w-full grid-cols-2 gap-3 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={`skeleton-${i}`} />
              ))}
            </div>
          ) : (
            <div aria-hidden="true" className="h-1 w-full" />
          )}
        </div>
      )}
    </div>
  );
});
