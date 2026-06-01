'use client';

import Image from 'next/image';
import { useState } from 'react';
import { BeerOff, Check, ChevronDown, Dices, PiggyBank } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';

// ---------------------------------------------------------------------------
// Tier derivation (exported for direct unit testing)
// ---------------------------------------------------------------------------

export function computeSealTier(
  verificationMethod: 'online' | 'onsite' | null | undefined,
  hasCertificate: boolean | null | undefined,
): 'bronze' | 'silver' | 'gold' {
  if (hasCertificate) return 'gold';
  if ((verificationMethod ?? 'online') === 'onsite') return 'silver';
  return 'bronze';
}

type SealTier = 'bronze' | 'silver' | 'gold';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProofTierCardProps {
  verificationMethod: 'online' | 'onsite' | null | undefined;
  hasCertificate: boolean | null | undefined;
  listingType?: Provider['listing_type'];
  noAlcohol?: Provider['no_alcohol'];
  noPork?: Provider['no_pork'];
  noGambling?: Provider['no_gambling'];
}

// ---------------------------------------------------------------------------
// SealImage: individual seal with onError fallback (colored circle + initial)
// ---------------------------------------------------------------------------

const SEAL_FALLBACK: Record<SealTier, { bg: string; color: string; initial: string }> = {
  bronze: { bg: '#CD7F32', color: '#fff', initial: 'B' },
  silver: { bg: '#A8A9AD', color: '#fff', initial: 'S' },
  gold: { bg: '#C8A848', color: '#fff', initial: 'G' },
};

function SealImage({
  tier,
  isActive,
  altText,
}: {
  tier: SealTier;
  isActive: boolean;
  altText: string;
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass = isActive ? 'h-24 w-24' : 'h-16 w-16';
  const stateClass = isActive ? 'opacity-100 scale-110' : 'opacity-40 grayscale scale-100';
  const { bg, color, initial } = SEAL_FALLBACK[tier];

  if (failed) {
    return (
      <div
        aria-label={altText}
        className={`flex items-center justify-center rounded-full text-sm font-bold transition-all ${sizeClass} ${stateClass}`}
        role="img"
        style={{ backgroundColor: bg, color }}
      >
        {initial}
      </div>
    );
  }

  return (
    <Image
      alt={altText}
      className={`object-contain transition-all ${sizeClass} ${stateClass}`}
      height={96}
      priority={false}
      src={`/images/seals/seal-${tier}.webp`}
      width={96}
      onError={() => setFailed(true)}
    />
  );
}

// ---------------------------------------------------------------------------
// SealRow: all 3 seals in order; RTL reverses layout
// ---------------------------------------------------------------------------

const TIER_ORDER: SealTier[] = ['bronze', 'silver', 'gold'];

function SealRow({
  activeTier,
  altBronze,
  altSilver,
  altGold,
  isRtl,
}: {
  activeTier: SealTier;
  altBronze: string;
  altSilver: string;
  altGold: string;
  isRtl: boolean;
}) {
  const alts: Record<SealTier, string> = { bronze: altBronze, silver: altSilver, gold: altGold };
  const displayOrder = isRtl ? [...TIER_ORDER].reverse() : TIER_ORDER;

  return (
    <div className="flex items-end justify-center gap-4" role="group">
      {displayOrder.map((tier) => (
        <SealImage
          key={tier}
          altText={alts[tier]}
          isActive={tier === activeTier}
          tier={tier}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryText: split-and-wrap bold formatting via {{highlight}} markers
// ---------------------------------------------------------------------------

function SummaryText({ text }: { text: string }) {
  if (!text.includes('{{highlight}}')) {
    return <p className="text-sm text-content">{text}</p>;
  }

  const segments: ReactNode[] = [];
  const outerParts = text.split('{{highlight}}');
  segments.push(outerParts[0]);
  for (let i = 1; i < outerParts.length; i++) {
    const inner = outerParts[i].split('{{/highlight}}');
    segments.push(
      <strong key={i} className="font-semibold text-content-heading">
        {inner[0]}
      </strong>,
    );
    if (inner[1]) segments.push(inner[1]);
  }

  return <p className="text-sm text-content">{segments}</p>;
}

// ---------------------------------------------------------------------------
// Halal icon (inline — avoids re-importing AttestationCard)
// ---------------------------------------------------------------------------

function HalalIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
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

type AttestationItemKey = 'halalOnly' | 'noAlcohol' | 'noPork' | 'noGambling';

const ATTESTATION_ITEMS: Array<{ key: AttestationItemKey; icon: ReactNode }> = [
  { key: 'halalOnly', icon: <HalalIcon /> },
  {
    key: 'noAlcohol',
    icon: <BeerOff aria-hidden className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    key: 'noPork',
    icon: <PiggyBank aria-hidden className="h-5 w-5" strokeWidth={1.5} />,
  },
  {
    key: 'noGambling',
    icon: <Dices aria-hidden className="h-5 w-5" strokeWidth={1.5} />,
  },
];

// ---------------------------------------------------------------------------
// GoldAttestationSection: renders inline for gold tier
// ---------------------------------------------------------------------------

function GoldAttestationSection({
  noAlcohol,
  noPork,
  noGambling,
  t,
}: {
  noAlcohol?: boolean | null;
  noPork?: boolean | null;
  noGambling?: boolean | null;
  t: (key: string) => string;
}) {
  const hasAnyDeclared = Boolean(noAlcohol) || Boolean(noPork) || Boolean(noGambling);
  if (!hasAnyDeclared) return null;

  const subtitleText = t('providerDetail.attestation.subtitleDeclared');
  const allahParts = subtitleText.split('Allah');
  const hasAllahToken = allahParts.length >= 2;

  return (
    <section
      aria-label={t('providerDetail.attestation.title')}
      className="mt-3 border-t border-border/40 pt-3"
    >
      {hasAllahToken ? (
        <p className="w-full font-inter text-base leading-6 text-uFlowText2">
          {allahParts[0]}
          <span className="bg-gold-gradient bg-clip-text font-semibold text-transparent">
            Allah
          </span>
          {allahParts[1]}
        </p>
      ) : (
        <p className="w-full font-inter text-base leading-6 text-uFlowText2">{subtitleText}</p>
      )}

      <div className="mb-2 mt-3 space-y-1">
        {ATTESTATION_ITEMS.map(({ key, icon }) => (
          <div key={key} className="flex items-center gap-3 py-1">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-dark"
            >
              {icon}
            </span>
            <div>
              <p className="text-sm font-medium text-content-heading">
                {t(`providerDetail.attestation.${key}`)}
              </p>
              <p className="text-xs leading-5 text-content">
                {t(`providerDetail.attestation.${key}DeclaredDetail`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ProofTierCard
// ---------------------------------------------------------------------------

export function ProofTierCard({
  verificationMethod,
  hasCertificate,
  listingType,
  noAlcohol,
  noPork,
  noGambling,
}: ProofTierCardProps) {
  const { language, t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const tier = computeSealTier(verificationMethod, hasCertificate);
  const isRtl = language === 'ar' || language === 'ur' || language === 'ps';
  const certOnFile = Boolean(hasCertificate);
  const onsiteVerified = (verificationMethod ?? 'online') === 'onsite';

  const summaryKey =
    tier === 'bronze'
      ? 'providerDetail.proofTier.summaryBronze'
      : tier === 'silver'
        ? 'providerDetail.proofTier.summarySilver'
        : onsiteVerified
          ? 'providerDetail.proofTier.summaryGoldCert'
          : 'providerDetail.proofTier.summaryGoldCertOnly';

  const supportsAttestation = listingType === 'food' || listingType === 'store';

  return (
    <section
      aria-label={t('providerDetail.proofTier.sectionTitle')}
      className="space-y-3"
    >
      <SealRow
        activeTier={tier}
        altBronze={t('providerDetail.proofTier.sealAltBronze')}
        altGold={t('providerDetail.proofTier.sealAltGold')}
        altSilver={t('providerDetail.proofTier.sealAltSilver')}
        isRtl={isRtl}
      />

      <SummaryText text={t(summaryKey)} />

      <div className="rounded-lg border border-border/50 bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-content-heading">
          {t('providerDetail.proofTier.whatWeVerified')}
        </p>
        <ul className="space-y-1.5 text-sm text-content">
          <li className="flex items-start gap-2">
            <Check aria-hidden className="mt-0.5 h-4 w-4 text-[#2B6D66]" />
            <span>{t('providerDetail.proofTier.checkMenuReviewed')}</span>
          </li>
          {certOnFile ? (
            <li className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 text-[#2B6D66]" />
              <span>{t('providerDetail.proofTier.checkCertificateOnFile')}</span>
            </li>
          ) : null}
          {onsiteVerified ? (
            <>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-4 w-4 text-[#2B6D66]" />
                <span>{t('providerDetail.proofTier.checkOnsiteVisit')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden className="mt-0.5 h-4 w-4 text-[#2B6D66]" />
                <span>{t('providerDetail.proofTier.checkOwnerConfirmed')}</span>
              </li>
            </>
          ) : null}
        </ul>

        {tier === 'gold' && supportsAttestation ? (
          <GoldAttestationSection
            noAlcohol={noAlcohol}
            noGambling={noGambling}
            noPork={noPork}
            t={t}
          />
        ) : null}
      </div>

      <button
        aria-expanded={isExpanded}
        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-content-heading"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {t('providerDetail.proofTier.whatIsThis')}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded ? (
        <p className="mt-2 text-sm text-content">{t('providerDetail.proofTier.explanation')}</p>
      ) : null}
    </section>
  );
}
