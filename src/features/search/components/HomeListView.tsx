'use client';

import { useRouter } from 'next/navigation';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { useLanguage } from '@/providers/LanguageProvider';
import type { MapPin } from './SearchMap';

interface HomeListViewProps {
  pins: MapPin[];
  isLoading: boolean;
  isOpenNow: boolean;
  /** Header height in px — list scrolls from below the fixed header */
  headerOffset: number;
}

export function HomeListView({ pins, isLoading, isOpenNow, headerOffset }: HomeListViewProps) {
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

  if (pins.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[21] flex flex-col items-center justify-center bg-uflow-light px-6 text-center"
        style={{ paddingTop: headerOffset }}
      >
        <p className="font-inter-tight text-base font-semibold text-content-heading">
          {isOpenNow ? t('map.noOpenProviders') : t('map.noProviders')}
        </p>
        <p className="mt-1 text-sm text-content-muted">
          {isOpenNow ? t('map.noOpenProvidersHint') : t('map.noProvidersHint')}
        </p>
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
        {pins.map((pin) => (
          <div
            key={pin.providerId}
            className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/providers/${pin.providerId}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/providers/${pin.providerId}`);
              }
            }}
          >
            <ProviderCard
              address_city={pin.address_city ?? null}
              address_country={null}
              address_street={null}
              address_zip={null}
              category={pin.category ?? { name_de: '' }}
              category_id={pin.category_id ?? null}
              contact_email={null}
              contact_phone={null}
              created_at={null}
              hideWebsiteButton={true}
              listing_type="food"
              location_latitude={pin.lat}
              location_longitude={pin.lng}
              needs_ids={[]}
              offers_ids={[]}
              opening_hours={pin.opening_hours ?? null}
              provider_id={pin.providerId}
              provider_images={pin.provider_images ?? null}
              provider_name={pin.providerName}
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
