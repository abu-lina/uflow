'use client';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';

interface AttestationCardProps {
  listingType: Provider['listing_type'];
  noAlcohol: Provider['no_alcohol'];
  noPork: Provider['no_pork'];
  noGambling: Provider['no_gambling'];
}

interface AttestationItem {
  key: 'noAlcohol' | 'noPork' | 'noGambling';
  enabled: boolean;
}

export function AttestationCard({
  listingType,
  noAlcohol,
  noPork,
  noGambling,
}: AttestationCardProps) {
  const { t } = useLanguage();

  if (listingType !== 'food' && listingType !== 'store') {
    return null;
  }

  const items = [
    { key: 'noAlcohol', enabled: Boolean(noAlcohol) },
    { key: 'noPork', enabled: Boolean(noPork) },
    { key: 'noGambling', enabled: Boolean(noGambling) },
  ] satisfies AttestationItem[];

  const declaredItems = items.filter((item) => item.enabled);

  if (declaredItems.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={t('providerDetail.attestation.title')}
      className="rounded-2xl border border-[#8ec7bd] bg-[#e8f5f2] px-4 py-4"
    >
      <h4 className="font-inter-tight text-base font-semibold text-content-heading">
        {t('providerDetail.attestation.title')}
      </h4>
      <p className="mt-1 text-sm text-uFlowText2">{t('providerDetail.attestation.subtitle')}</p>

      <ul className="mt-3 space-y-2" role="list">
        {declaredItems.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-sm text-content-heading">
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2f7f79] text-xs font-semibold text-white"
            >
              ✓
            </span>
            <span>{t(`providerDetail.attestation.${item.key}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
