'use client';

import { useMemo, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { CircleParking, HandHeart, HeartHandshake, Moon, UtensilsCrossed, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { TrustBadgesSection } from '@/components/providers/TrustBadgesSection';
import { ExpandSection } from '@/components/ui/ExpandSection';
import { AttestationCard } from '@/features/providers/components/AttestationCard';
import { PrayerRug } from '@/components/icons/PrayerRug';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import type { OpeningHours } from '@/types/openingHours';
import type { BadgeWithConfirmationStatus, ProviderBadgeWithType } from '@/types/badges';

interface ProviderDetailSectionsProps {
  provider: Provider;
  badges: (BadgeWithConfirmationStatus | ProviderBadgeWithType)[];
  isLoadingBadges: boolean;
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

function buildAmenityLabels(provider: Provider, t: (key: string) => string): Array<{ label: string; Icon: AmenityItem['Icon'] }> {
  const entries: AmenityItem[] = [
    { enabled: provider.muslim_owned, labelKey: 'providerDetail.amenities.muslimOwned', Icon: Moon },
    { enabled: provider.has_prayer_space, labelKey: 'providerDetail.amenities.prayerSpace', Icon: PrayerRug },
    { enabled: provider.has_parking, labelKey: 'providerDetail.amenities.parking', Icon: CircleParking },
    { enabled: provider.no_alcohol, labelKey: 'providerDetail.amenities.noAlcohol', Icon: Moon },
    { enabled: provider.no_pork, labelKey: 'providerDetail.amenities.noPork', Icon: Moon },
    { enabled: provider.family_friendly, labelKey: 'providerDetail.amenities.familyFriendly', Icon: Users },
    { enabled: provider.women_friendly, labelKey: 'providerDetail.amenities.womenFriendly', Icon: Users },
    { enabled: provider.children_friendly, labelKey: 'providerDetail.amenities.childrenFriendly', Icon: Users },
    { enabled: provider.makes_donations, labelKey: 'providerDetail.amenities.acceptsDonations', Icon: HandHeart },
    { enabled: provider.economic_solidarity, labelKey: 'providerDetail.amenities.solidarityPricing', Icon: HeartHandshake },
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

function DetailListItem({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-xl p-2">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E3F2EF] text-primary">
        {icon}
      </span>
      <span className="text-base font-semibold text-content-heading">{label}</span>
    </div>
  );
}

export function ProviderDetailSections({
  provider,
  badges,
  isLoadingBadges,
}: ProviderDetailSectionsProps) {
  const { t } = useLanguage();
  const amenities = useMemo(() => buildAmenityLabels(provider, t), [provider, t]);
  const supportsAttestation = provider.listing_type === 'food' || provider.listing_type === 'store';

  const { data: nearbyProviders = [], isLoading: isLoadingNearbyProviders, isFetching: isFetchingNearbyProviders } = useQuery({
    queryKey: ['provider-nearby-city', provider.provider_id, provider.address_city],
    queryFn: async () => {
      if (!provider.address_city) {
        return [] as Array<{ provider_id: string; provider_name: string }>;
      }

      const { data, error } = await supabase
        .from('providers')
        .select('provider_id, provider_name')
        .eq('address_city', provider.address_city)
        .eq('review_status', 'approved')
        .neq('provider_id', provider.provider_id)
        .limit(5);

      if (error) {
        return [] as Array<{ provider_id: string; provider_name: string }>;
      }

      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-3">
      <ExpandSection defaultOpen title={t('providerDetail.sections.valuesAmenities')}>
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

      <ExpandSection title={t('providerDetail.sections.menu')}>
        <div className="space-y-2 pt-3">
          {provider.offers?.length ? (
            provider.offers.map((offer, index) => (
              <DetailListItem
                key={`${offer.name_de}-${index}`}
                icon={<UtensilsCrossed aria-hidden="true" className="h-6 w-6" />}
                label={offer.name_de}
              />
            ))
          ) : (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noMenu')}</p>
          )}
        </div>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.openingHours')}>
        {renderOpeningHours(provider.opening_hours, t)}
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.proofs')}>
        <div className="space-y-3 pt-3">
          <AttestationCard
            halalLevel={provider.halal_level}
            listingType={provider.listing_type}
            noAlcohol={provider.no_alcohol}
            noGambling={provider.no_gambling}
            noPork={provider.no_pork}
          />
          {!supportsAttestation && badges.length === 0 && !isLoadingBadges ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noProofs')}</p>
          ) : (
            <TrustBadgesSection badges={badges} isLoading={isLoadingBadges} />
          )}
        </div>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.feedback')}>
        <p className="pt-3 text-sm text-[#7a7a7a]">{t('providerDetail.empty.noFeedback')}</p>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.nearby')}>
        <div className="space-y-2 pt-3">
          {isLoadingNearbyProviders || isFetchingNearbyProviders ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.loading.nearby')}</p>
          ) : nearbyProviders.length === 0 ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noNearby')}</p>
          ) : (
            nearbyProviders.map((nearby) => (
              <p key={nearby.provider_id} className="text-sm text-content-heading">
                {nearby.provider_name}
              </p>
            ))
          )}
        </div>
      </ExpandSection>
    </div>
  );
}