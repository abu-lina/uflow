'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import type { Location } from '@/types/location';
import { getOpenStatus } from '@/utils/openStatus';

interface OpenStatusLineProps {
  provider: Provider;
  locationId?: string;
}

export function OpenStatusLine({ provider, locationId }: OpenStatusLineProps) {
  const { t } = useLanguage();

  const resolvedHours = (() => {
    if (locationId && provider.locations) {
      const location = provider.locations.find((l: Location) => l.location_id === locationId);
      if (location?.opening_hours) return location.opening_hours;
    }
    return provider.opening_hours ?? null;
  })();

  const status = getOpenStatus(resolvedHours);

  if (!status.visible) {
    return null;
  }

  const statusLabel = status.isOpen
    ? t('providerDetail.openStatus.open')
    : t('providerDetail.openStatus.closed');

  let nextChangeLabel = '';
  if (status.isOpen) {
    nextChangeLabel = t('providerDetail.openStatus.untilOpen', {
      time: status.nextChangeTime ?? '',
    });
  } else if (status.nextChangeDay) {
    nextChangeLabel = t('providerDetail.openStatus.opensOnDay', {
      time: status.nextChangeTime ?? '',
      day: t(`providerDetail.days.${status.nextChangeDay}`),
    });
  } else {
    nextChangeLabel = t('providerDetail.openStatus.opensTomorrow', {
      time: status.nextChangeTime ?? '',
    });
  }

  return (
    <div className="mt-1 flex items-center">
      <span
        className="font-inter text-base font-medium leading-normal"
        style={{ color: status.isOpen ? '#2d8a45' : '#c24040' }}
      >
        {statusLabel}
      </span>
      <span aria-hidden className="mx-0.5 inline-flex size-4 items-center justify-center font-inter text-base font-medium leading-none text-uFlowText2">
        •
      </span>
      <span className="font-inter text-base font-medium leading-normal text-uFlowText2">
        {nextChangeLabel}
      </span>
    </div>
  );
}