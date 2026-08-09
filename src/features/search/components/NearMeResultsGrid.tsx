'use client';

import { ProviderCard } from '@/components/providers/ProviderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import type { NearMeFoodResult } from '@/services/providers';

interface NearMeResultsGridProps {
  results: NearMeFoodResult[];
  bookmarkedProviderIds: string[];
  isLoading: boolean;
  error: Error | null;
  onProviderClick: (providerId: string) => void;
  onBookmarkChange: (providerId: string, isBookmarked: boolean) => void;
  onRetry: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * NearMeResultsGrid — renders "near me" search results (Plan 196, M4).
 *
 * Distance-ordered rows are passed straight through (the RPC + any client-side
 * open-now filtering both preserve ascending-distance order — Critic F4).
 * Reuses ProviderCard (with the new `distanceKm` prop) and the existing
 * SkeletonGrid/EmptyState primitives so loading/empty/error states match the
 * rest of the app.
 */
export function NearMeResultsGrid({
  results,
  bookmarkedProviderIds,
  isLoading,
  error,
  onProviderClick,
  onBookmarkChange,
  onRetry,
  t,
}: NearMeResultsGridProps) {
  if (isLoading) {
    return (
      <div>
        <p className="sr-only" role="status">
          {t('suchen.nearMe.loading')}
        </p>
        <SkeletonGrid count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center">
        <EmptyState
          description={t('suchen.nearMe.errorLoading')}
          title={t('suchen.nearMe.errorTitle')}
        />
        <button
          className="mt-2 font-inter-tight text-sm font-medium text-primary underline underline-offset-2"
          type="button"
          onClick={onRetry}
        >
          {t('suchen.nearMe.retry')}
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return <EmptyState description={t('suchen.empty.noNearby')} title={t('suchen.nearMe.emptyTitle')} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 xl:grid-cols-4">
      {results.map((result) => (
        <div
          key={result.provider_id}
          className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          role="button"
          tabIndex={0}
          onClick={() => onProviderClick(result.provider_id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onProviderClick(result.provider_id);
            }
          }}
        >
          <ProviderCard
            address_city={result.address_city}
            address_country={null}
            address_street={null}
            address_zip={null}
            category={{
              name_de: result.category_name_de ?? result.category_name_en ?? '',
              name_en: result.category_name_en ?? undefined,
              category_images: result.category_images ?? undefined,
            }}
            category_id={result.category_id}
            contact_email={null}
            contact_phone={null}
            created_at={null}
            distanceKm={result.distance_km}
            hideWebsiteButton={true}
            isBookmarked={bookmarkedProviderIds.includes(result.provider_id)}
            listing_type="food"
            location_latitude={result.location_latitude}
            location_longitude={result.location_longitude}
            needs_ids={[]}
            offers_ids={[]}
            opening_hours={result.opening_hours}
            provider_id={result.provider_id}
            provider_images={result.provider_images}
            provider_name={result.provider_name}
            social_instagram={null}
            social_website={null}
            updated_at={null}
            onBookmarkChange={(isBookmarked) => onBookmarkChange(result.provider_id, isBookmarked)}
          />
        </div>
      ))}
    </div>
  );
}
