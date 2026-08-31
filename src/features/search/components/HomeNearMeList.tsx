'use client';

import { useRouter } from 'next/navigation';
import { ProviderCard } from '@/features/providers/components/ProviderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { useLanguage } from '@/providers/LanguageProvider';
import type { NearMeFoodResult } from '@/services/providers';

interface HomeNearMeListProps {
  results: NearMeFoodResult[];
  isLoading: boolean;
  error: Error | null;
  headerOffset: number;
  onRetry: () => void;
}

/**
 * HomeNearMeList — renders "near me" results on the home List view (Plan 217).
 *
 * Mirrors HomeListView's scroll wrapper so the list sits under the fixed header
 * and scrolls identically. Maps NearMeFoodResult rows to ProviderCard with the
 * distance badge and the same category fallback used by NearMeResultsGrid.
 * Intentionally does not render bookmark affordances (consistent with the
 * non-near-me home list).
 */
export function HomeNearMeList({
  results,
  isLoading,
  error,
  headerOffset,
  onRetry,
}: HomeNearMeListProps) {
  const router = useRouter();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[21] overflow-y-auto bg-uflow-light"
        style={{ paddingTop: headerOffset }}
      >
        <div className="px-4 pt-3">
          <SkeletonGrid count={8} />
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
    return (
      <div
        className="fixed inset-0 z-[21] flex flex-col items-center justify-center bg-uflow-light px-6 text-center"
        style={{ paddingTop: headerOffset }}
      >
        <EmptyState
          description={t('suchen.empty.noNearby')}
          title={t('suchen.nearMe.emptyTitle')}
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
        {results.map((result) => (
          <div
            key={result.provider_id}
            className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/providers/${result.provider_id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/providers/${result.provider_id}`);
              }
            }}
          >
            <ProviderCard
              hideWebsiteButton
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
