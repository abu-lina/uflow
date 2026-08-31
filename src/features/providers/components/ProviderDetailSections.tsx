'use client';

import { useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleParking,
  HandHeart,
  HeartHandshake,
  MapPin,
  Moon,
  Store,
  Tag,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { TrustBadgesSection } from '@/features/providers/components/TrustBadgesSection';
import { ExpandSection } from '@/components/ui/ExpandSection';
import { ProofTierCard } from '@/features/providers/components/ProofTierCard';
import { PrayerRug } from '@/components/icons/PrayerRug';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import type { OpeningHours } from '@/types/openingHours';
import type { BadgeWithConfirmationStatus, ProviderBadgeWithType } from '@/types/badges';
import type { Location } from '@/types/location';

interface ProviderDetailSectionsProps {
  provider: Provider;
  badges: (BadgeWithConfirmationStatus | ProviderBadgeWithType)[];
  isLoadingBadges: boolean;
  locations?: Location[];
  selectedLocationId?: string | null;
  onLocationSelect?: (locationId: string) => void;
}

const DAY_ORDER: Array<{ key: keyof OpeningHours; labelKey: string }> = [
  { key: 'monday', labelKey: 'providerDetail.days.monday' },
  { key: 'tuesday', labelKey: 'providerDetail.days.tuesday' },
  { key: 'wednesday', labelKey: 'providerDetail.days.wednesday' },
  { key: 'thursday', labelKey: 'providerDetail.days.thursday' },
  { key: 'friday', labelKey: 'providerDetail.days.friday' },
  { key: 'saturday', labelKey: 'providerDetail.days.saturday' },
  { key: 'sunday', labelKey: 'providerDetail.days.sunday' },
];

type AmenityItem = {
  enabled: boolean | undefined;
  labelKey: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

function buildAmenityLabels(
  provider: Provider,
  t: (key: string) => string,
): Array<{ label: string; Icon: AmenityItem['Icon'] }> {
  const entries: AmenityItem[] = [
    {
      enabled: provider.muslim_owned,
      labelKey: 'providerDetail.amenities.muslimOwned',
      Icon: Moon,
    },
    {
      enabled: provider.has_prayer_space,
      labelKey: 'providerDetail.amenities.prayerSpace',
      Icon: PrayerRug,
    },
    {
      enabled: provider.has_parking,
      labelKey: 'providerDetail.amenities.parking',
      Icon: CircleParking,
    },
    {
      enabled: provider.family_friendly,
      labelKey: 'providerDetail.amenities.familyFriendly',
      Icon: Users,
    },
    {
      enabled: provider.women_friendly,
      labelKey: 'providerDetail.amenities.womenFriendly',
      Icon: Users,
    },
    {
      enabled: provider.children_friendly,
      labelKey: 'providerDetail.amenities.childrenFriendly',
      Icon: Users,
    },
    {
      enabled: provider.makes_donations,
      labelKey: 'providerDetail.amenities.acceptsDonations',
      Icon: HandHeart,
    },
    {
      enabled: provider.economic_solidarity,
      labelKey: 'providerDetail.amenities.solidarityPricing',
      Icon: HeartHandshake,
    },
  ];

  return entries
    .filter((entry) => Boolean(entry.enabled))
    .map((entry) => ({
      label: t(entry.labelKey),
      Icon: entry.Icon,
    }));
}

function renderOpeningHours(
  openingHours: OpeningHours | null | undefined,
  t: (key: string) => string,
) {
  if (!openingHours || typeof openingHours !== 'object') {
    return <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noOpeningHours')}</p>;
  }

  return (
    <div className="space-y-3 pt-3">
      {DAY_ORDER.map(({ key, labelKey }) => {
        const value = openingHours[key];
        const display =
          value && typeof value === 'object' && 'open' in value && 'close' in value
            ? `${value.open} - ${value.close}`
            : t('providerDetail.openStatus.closed');

        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-base font-semibold text-content-heading">{t(labelKey)}</span>
            <span className="text-base font-normal text-content">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

function DetailListItem({ label, icon, onClick, isSelected }: { label: string; icon: ReactNode; onClick?: () => void; isSelected?: boolean }) {
  const Component = onClick ? 'button' : 'div';
  const className = `flex w-full items-center gap-3 rounded-xl p-2${onClick ? ' cursor-pointer' : ''}`;
  return (
    <Component
      className={className}
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-[#E3F2EF] text-primary'}`}>
        {icon}
      </span>
      <span className="text-base font-semibold text-content-heading">{label}</span>
    </Component>
  );
}

export function ProviderDetailSections({
  provider,
  badges,
  isLoadingBadges,
  locations,
  selectedLocationId,
  onLocationSelect,
}: ProviderDetailSectionsProps) {
  const { t } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>('halal');
  const router = useRouter();
  const amenities = useMemo(() => buildAmenityLabels(provider, t), [provider, t]);
  const {
    data: nearbyProviders = [],
    isLoading: isLoadingNearbyProviders,
    isFetching: isFetchingNearbyProviders,
  } = useQuery({
    queryKey: ['provider-nearby-food', provider.provider_id, provider.location_latitude, provider.location_longitude, provider.address_city],
    queryFn: async () => {
      type NearbyResult = { provider_id: string; provider_name: string; distance_km?: number };

      if (provider.location_latitude != null && provider.location_longitude != null) {
        const { data, error } = await supabase.rpc('find_nearby_food_providers', {
          p_lat: provider.location_latitude,
          p_lon: provider.location_longitude,
          p_exclude_id: provider.provider_id,
          p_radius_km: 10,
          p_limit: 3,
        });

        if (!error && data && data.length > 0) {
          return data as NearbyResult[];
        }
        if (error) {
          console.error('[find_nearby_food_providers] RPC error:', error);
        }
      }

      if (!provider.address_city) return [];

      const { data, error } = await supabase
        .from('providers')
        .select('provider_id, provider_name')
        .eq('address_city', provider.address_city)
        .eq('listing_type', 'food')
        .eq('review_status', 'approved')
        .neq('provider_id', provider.provider_id)
        .limit(3);

      if (error) {
        console.error('[find_nearby_food_providers] Fallback error:', error);
        return [];
      }

      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col gap-4 self-stretch">
      <ExpandSection
        isOpen={openSection === 'halal'}
        title={t('providerDetail.proofTier.sectionTitle')}
        onToggle={(next) => setOpenSection(next ? 'halal' : null)}
      >
        <div className="space-y-3 pt-3">
          <ProofTierCard
            hasCertificate={provider.has_certificate}
            listingType={provider.listing_type}
            noAlcohol={provider.no_alcohol}
            noGambling={provider.no_gambling}
            noPork={provider.no_pork}
            verificationMethod={provider.verification_method}
          />
        </div>
      </ExpandSection>

      <ExpandSection
        isOpen={openSection === 'values'}
        title={t('providerDetail.sections.valuesAmenities')}
        onToggle={(next) => setOpenSection(next ? 'values' : null)}
      >
        <div className="space-y-2 pt-3">
          {amenities.length === 0 ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noValuesAmenities')}</p>
          ) : (
            amenities.map((item) => (
              <DetailListItem
                key={item.label}
                icon={<item.Icon aria-hidden={true} className="h-6 w-6" />}
                label={item.label}
              />
            ))
          )}
        </div>
      </ExpandSection>

      {/* Menu (food) — Offers (store) */}
      <ExpandSection
        isOpen={openSection === 'menu-offers'}
        title={t(provider.listing_type === 'store' ? 'providerDetail.sections.offers' : 'providerDetail.sections.menu')}
        onToggle={(next) => setOpenSection(next ? 'menu-offers' : null)}
      >
        <div className="space-y-2 pt-3">
          {(() => {
            if (provider.listing_type === 'food' && provider.food_menu_items?.length) {
              return provider.food_menu_items.map((item, index) => (
                <DetailListItem
                  key={`menu-${index}`}
                  icon={<UtensilsCrossed aria-hidden="true" className="h-6 w-6" />}
                  label={item.name_de}
                />
              ));
            }
            if (provider.offers?.length) {
              return provider.offers.map((offer, index) => (
                <DetailListItem
                  key={`${offer.name_de}-${index}`}
                  icon={provider.listing_type === 'store' ? <Tag aria-hidden="true" className="h-6 w-6" /> : <UtensilsCrossed aria-hidden="true" className="h-6 w-6" />}
                  label={offer.name_de}
                />
              ));
            }
            return <p className="text-sm text-[#7a7a7a]">{t(provider.listing_type === 'store' ? 'providerDetail.empty.noOffers' : 'providerDetail.empty.noMenu')}</p>;
          })()}
        </div>
      </ExpandSection>

      <ExpandSection
        isOpen={openSection === 'opening-hours'}
        title={t('providerDetail.sections.openingHours')}
        onToggle={(next) => setOpenSection(next ? 'opening-hours' : null)}
      >
        {renderOpeningHours(provider.opening_hours, t)}
      </ExpandSection>

      {(locations?.length ?? 0) > 1 && (
        <div id="standorte-section">
          <ExpandSection
            isOpen={openSection === 'standorte'}
            title={t('providerDetail.sections.furtherLocations')}
            onToggle={(next) => setOpenSection(next ? 'standorte' : null)}
          >
            <div className="space-y-2 pt-3">
              {(locations ?? []).map((loc) => (
                <DetailListItem
                  key={loc.location_id}
                  icon={<Store aria-hidden="true" className="h-6 w-6" />}
                  isSelected={loc.location_id === selectedLocationId || (!selectedLocationId && loc.is_primary)}
                  label={loc.location_name || loc.address_city || t('providerDetail.locationFallback')}
                  onClick={() => onLocationSelect?.(loc.location_id)}
                />
              ))}
            </div>
          </ExpandSection>
        </div>
      )}

      <TrustBadgesSection badges={badges} isLoading={isLoadingBadges} />

      <ExpandSection
        isOpen={openSection === 'nearby'}
        title={t('providerDetail.sections.nearby')}
        onToggle={(next) => setOpenSection(next ? 'nearby' : null)}
      >
        <div className="space-y-2 pt-3">
          {isLoadingNearbyProviders || isFetchingNearbyProviders ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.loading.nearby')}</p>
          ) : nearbyProviders.length === 0 ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noNearby')}</p>
          ) : (
            nearbyProviders.map((nearby) => (
              <DetailListItem
                key={nearby.provider_id}
                icon={<MapPin aria-hidden="true" className="h-6 w-6" />}
                label={nearby.provider_name}
                onClick={() => router.push(`/providers/${nearby.provider_id}`)}
              />
            ))
          )}
        </div>
      </ExpandSection>
    </div>
  );
}
