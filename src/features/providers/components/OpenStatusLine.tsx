'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';
import { getOpenStatus } from '@/utils/openStatus';

interface OpenStatusLineProps {
  provider: Provider;
}

export function OpenStatusLine({ provider }: OpenStatusLineProps) {
  const { t } = useLanguage();
  const status = getOpenStatus(provider.opening_hours ?? null);

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