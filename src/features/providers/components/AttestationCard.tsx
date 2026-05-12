'use client';

import { BeerOff, Dices, PiggyBank } from 'lucide-react';
import type { SVGProps } from 'react';
import { InfoTrailing } from '@/components/ui/InfoTrailing';
import { RowItem } from '@/components/ui/RowItem';
import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';

// Halal certification mark icon — hugeicons:halal style (MIT License)
function HalalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.25 8.75V15.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M8.25 12H11.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M11.75 8.75V15.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      <path
        d="M13.5 15.25V10.75C13.5 9.64543 14.3954 8.75 15.5 8.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

interface AttestationCardProps {
  listingType: Provider['listing_type'];
  halalLevel: Provider['halal_level'];
  noAlcohol: Provider['no_alcohol'];
  noPork: Provider['no_pork'];
  noGambling: Provider['no_gambling'];
}

type ItemKey = 'halalOnly' | 'noAlcohol' | 'noPork' | 'noGambling';

interface ItemDef {
  key: ItemKey;
  renderIcon: (className: string) => React.ReactNode;
}

const ITEMS: ItemDef[] = [
  {
    key: 'halalOnly',
    renderIcon: (cls) => <HalalIcon className={cls} />,
  },
  {
    key: 'noAlcohol',
    renderIcon: (cls) => <BeerOff aria-hidden className={cls} strokeWidth={1.5} />,
  },
  {
    key: 'noPork',
    renderIcon: (cls) => <PiggyBank aria-hidden className={cls} strokeWidth={1.5} />,
  },
  {
    key: 'noGambling',
    renderIcon: (cls) => <Dices aria-hidden className={cls} strokeWidth={1.5} />,
  },
];

export function AttestationCard({
  listingType,
  halalLevel,
  noAlcohol,
  noPork,
  noGambling,
}: AttestationCardProps) {
  const { t } = useLanguage();

  if (listingType !== 'food' && listingType !== 'store') {
    return null;
  }

  const hasAnyDeclared =
    (typeof halalLevel === 'number' && halalLevel > 0) ||
    Boolean(noAlcohol) ||
    Boolean(noPork) ||
    Boolean(noGambling);

  // Split subtitle around "Allah" so we can apply the gold gradient to the word
  const declaredSubtitle = t('providerDetail.attestation.subtitleDeclared');
  const allahParts = declaredSubtitle.split('Allah');
  const hasAllahToken = allahParts.length >= 2;

  return (
    <section
      aria-label={t('providerDetail.attestation.title')}
      className="mt-3"
    >
      {/* Subtitle */}
      {hasAnyDeclared ? (
        hasAllahToken ? (
          <p className="w-full font-inter text-base leading-6 text-uFlowText2">
            {allahParts[0]}
            <span className="bg-gold-gradient bg-clip-text font-semibold text-transparent">
              Allah
            </span>
            {allahParts[1]}
          </p>
        ) : (
          <p className="w-full font-inter text-base leading-6 text-uFlowText2">{declaredSubtitle}</p>
        )
      ) : (
        <p className="w-full font-inter text-base leading-6 text-uFlowText2">
          {t('providerDetail.attestation.subtitleFallback')}
        </p>
      )}

      {/* Commitment items */}
      <div className="mb-2 mt-3 space-y-1">
        {ITEMS.map(({ key, renderIcon }) => (
          <RowItem
            key={key}
            icon={
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-icon-surface text-primary-dark"
              >
                {renderIcon('h-6 w-6')}
              </span>
            }
            selectable={false}
            subtitle={
              hasAnyDeclared
                ? t(`providerDetail.attestation.${key}DeclaredDetail`)
                : t(`providerDetail.attestation.${key}FallbackDetail`)
            }
            title={t(`providerDetail.attestation.${key}`)}
            trailing={
              hasAnyDeclared && key === 'halalOnly' ? (
                <InfoTrailing />
              ) : null
            }
          />
        ))}
      </div>
    </section>
  );
}
