'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ExpandSection } from '@/components/ui/ExpandSection';
import { TrustBadgesSection } from '@/components/providers/TrustBadgesSection';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import type { ProviderBadgeWithType, BadgeWithConfirmationStatus } from '@/types/badges';
import type { OpeningHours } from '@/types/openingHours';

interface ProviderDetailSectionsProps {
  provider: Provider;
  badges: Array<ProviderBadgeWithType | BadgeWithConfirmationStatus>;
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

function buildAmenityLabels(provider: Provider, t: (key: string) => string): string[] {
  const entries: Array<[boolean | undefined, string]> = [
    [provider.muslim_owned, 'providerDetail.amenities.muslimOwned'],
    [provider.has_prayer_space, 'providerDetail.amenities.prayerSpace'],
    [provider.has_parking, 'providerDetail.amenities.parking'],
    [provider.no_alcohol, 'providerDetail.amenities.noAlcohol'],
    [provider.no_pork, 'providerDetail.amenities.noPork'],
    [provider.family_friendly, 'providerDetail.amenities.familyFriendly'],
    [provider.women_friendly, 'providerDetail.amenities.womenFriendly'],
    [provider.children_friendly, 'providerDetail.amenities.childrenFriendly'],
    [provider.makes_donations, 'providerDetail.amenities.acceptsDonations'],
    [provider.economic_solidarity, 'providerDetail.amenities.solidarityPricing'],
  ];

  return entries.filter(([enabled]) => Boolean(enabled)).map(([, labelKey]) => t(labelKey));
}

function renderOpeningHours(
  openingHours: OpeningHours | null | undefined,
  t: (key: string) => string,
) {
  if (!openingHours || typeof openingHours !== 'object') {
    return <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noOpeningHours')}</p>;
  }

  return (
    <div className="space-y-2 pt-3 text-sm">
      {DAY_ORDER.map(({ key, labelKey }) => {
        const value = openingHours[key];
        const display =
          value && typeof value === 'object' && 'open' in value && 'close' in value
            ? `${value.open} - ${value.close}`
            : t('providerDetail.openStatus.closed');

        return (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="font-medium text-content-heading">{t(labelKey)}</span>
            <span className="text-[#7a7a7a]">{display}</span>
          </div>
        );
      })}
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
              <p key={item} className="text-sm text-content-heading">
                {item}
              </p>
            ))
          )}
        </div>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.menu')}>
        <div className="space-y-2 pt-3">
          {provider.offers?.length ? (
            provider.offers.map((offer) => (
              <p key={offer.name_de} className="text-sm text-content-heading">
                {offer.name_de}
              </p>
            ))
          ) : (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noMenu')}</p>
          )}
        </div>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.openingHours')}>
        {renderOpeningHours(provider.opening_hours, t)}
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.feedback')}>
        <p className="pt-3 text-sm text-[#7a7a7a]">{t('providerDetail.empty.noFeedback')}</p>
      </ExpandSection>

      <ExpandSection title={t('providerDetail.sections.proofs')}>
        <div className="pt-3">
          {badges.length === 0 && !isLoadingBadges ? (
            <p className="text-sm text-[#7a7a7a]">{t('providerDetail.empty.noProofs')}</p>
          ) : (
            <TrustBadgesSection badges={badges} isLoading={isLoadingBadges} />
          )}
        </div>
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