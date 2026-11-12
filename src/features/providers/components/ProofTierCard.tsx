'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  BeerOff,
  ChevronDown,
  Dices,
  FileCheck,
  Lock,
  MapPin,
  PiggyBank,
  SquareMenu,
  UserCheck,
} from 'lucide-react';
import { HalalIcon as HugeHalalIcon } from 'hugeicons-react';
import type { ReactNode } from 'react';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Provider } from '@/services/providers';

// ---------------------------------------------------------------------------
// Tier derivation (exported for direct unit testing)
// ---------------------------------------------------------------------------

export function computeSealTier(
  verificationMethod: 'online' | 'onsite' | null | undefined,
  hasCertificate: boolean | null | undefined,
  attestation?: {
    noAlcohol?: boolean | null;
    noPork?: boolean | null;
    noGambling?: boolean | null;
  },
  certificateUrl?: string | null,
): 'bronze' | 'silver' | 'gold' | null {
  // AC6.8: gold requires an actual certificate on file. A bare has_certificate
  // toggle (upload failed, legacy row, self-declared) must not produce gold.
  const certified = Boolean(hasCertificate) && Boolean(certificateUrl);
  if (certified) return 'gold';
  if (!verificationMethod) return null;
  // Require at least one attestation answer before awarding a tier.
  // Without this, a provider with verification_method set as a DB default
  // (but no actual halal check done) would auto-show as bronze.
  if (attestation) {
    const hasAttestation =
      Boolean(attestation.noAlcohol) ||
      Boolean(attestation.noPork) ||
      Boolean(attestation.noGambling);
    if (!hasAttestation) return null;
  }
  if (verificationMethod === 'onsite') return 'silver';
  return 'bronze';
}

type SealTier = 'bronze' | 'silver' | 'gold';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProofTierCardProps {
  verificationMethod: 'online' | 'onsite' | null | undefined;
  hasCertificate: boolean | null | undefined;
  // Storage URL of the uploaded certificate; gold requires both the flag and
  // a real file behind it (AC6.8).
  certificateUrl?: string | null;
  listingType?: Provider['listing_type'];
  noAlcohol?: Provider['no_alcohol'];
  noPork?: Provider['no_pork'];
  noGambling?: Provider['no_gambling'];
  reviewStatus?: Provider['review_status'];
  // Renders the seal for a pending submission (success screen), labelled
  // provisional since review can still change or reject it.
  provisional?: boolean;
}

// ---------------------------------------------------------------------------
// SealRow: single combined seal image per active tier
// ---------------------------------------------------------------------------

const SEAL_COMBINED: Record<SealTier, string> = {
  bronze: '/images/seals/seals-bronze-active.png',
  silver: '/images/seals/seals-silver-active.png',
  gold: '/images/seals/seals-gold-active.png',
};

function SealRow({ activeTier, altText }: { activeTier: SealTier; altText: string }) {
  const src = SEAL_COMBINED[activeTier];
  return (
    <div className="mx-auto flex w-fit items-center justify-center" role="group">
      <Image
        alt={altText}
        className="-mb-4 block"
        height={120}
        priority={false}
        src={src}
        width={320}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryText: split-and-wrap bold formatting via {{highlight}} markers
// ---------------------------------------------------------------------------

function SummaryText({ text }: { text: string }) {
  if (!text.includes('{{highlight}}')) {
    return <p className="mb-3 text-base text-content">{text}</p>;
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

  return <p className="mb-3 text-base text-content">{segments}</p>;
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
// VerifiedChecklist: icon-based list of what was checked for active tier
// ---------------------------------------------------------------------------

interface CheckItem {
  icon: ReactNode;
  labelKey: string;
}

function getCheckItems(
  tier: SealTier,
  verificationMethod: 'online' | 'onsite' | null | undefined,
): CheckItem[] {
  const onsiteVerified = (verificationMethod ?? 'online') === 'onsite';

  if (tier === 'bronze') {
    return [
      {
        icon: <SquareMenu aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkMenuReviewed',
      },
      {
        icon: <BeerOff aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkSellsNoAlcohol',
      },
      {
        icon: <PiggyBank aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkSellsNoPork',
      },
      {
        icon: <HugeHalalIcon aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkClaimsMeatHalal',
      },
    ];
  }

  if (tier === 'silver') {
    return [
      {
        icon: <SquareMenu aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkMenuReviewedOnsite',
      },
      {
        icon: <BeerOff aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkSellsProcessNoAlcohol',
      },
      {
        icon: <PiggyBank aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkSellsProcessNoPork',
      },
      {
        icon: <HugeHalalIcon aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkMeatIsHalal',
      },
    ];
  }

  // gold
  const items: CheckItem[] = [
    {
      icon: <FileCheck aria-hidden className="h-6 w-6" />,
      labelKey: 'providerDetail.proofTier.checkCertificateOnFile',
    },
  ];
  if (onsiteVerified) {
    items.push(
      {
        icon: <MapPin aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkOnsiteVisit',
      },
      {
        icon: <UserCheck aria-hidden className="h-6 w-6" />,
        labelKey: 'providerDetail.proofTier.checkOwnerConfirmed',
      },
    );
  }
  return items;
}

function VerifiedChecklist({ items, t }: { items: CheckItem[]; t: (key: string) => string }) {
  return (
    <div>
      {items.map(({ icon, labelKey }) => (
        <div key={labelKey} className="flex w-full items-center gap-1 rounded-xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary">
            {icon}
          </span>
          <span className="text-sm font-semibold text-content-heading">{t(labelKey)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next tier mapping for "what's missing" section
// ---------------------------------------------------------------------------

const NEXT_TIER: Record<SealTier, SealTier | null> = {
  bronze: 'silver',
  silver: 'gold',
  gold: null,
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// ProofTierCard
// ---------------------------------------------------------------------------

export function ProofTierCard({
  verificationMethod,
  hasCertificate,
  certificateUrl,
  listingType,
  noAlcohol,
  noPork,
  noGambling,
  reviewStatus,
  provisional = false,
}: ProofTierCardProps) {
  const { t } = useLanguage();
  const [isVerifiedExpanded, setIsVerifiedExpanded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMissingExpanded, setIsMissingExpanded] = useState(false);

  const tier = computeSealTier(
    verificationMethod,
    hasCertificate,
    {
      noAlcohol,
      noPork,
      noGambling,
    },
    certificateUrl,
  );

  // No tier means no verification data — don't render the card at all
  if (!tier) return null;

  if (provisional) {
    return (
      <section aria-label={t('providerDetail.proofTier.sectionTitle')}>
        <SealRow
          activeTier={tier}
          altText={t(
            `providerDetail.proofTier.sealAlt${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
          )}
        />
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <HugeHalalIcon aria-hidden className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">{t('submissionStatus.provisionalSeal')}</p>
        </div>
      </section>
    );
  }

  // Don't show the seal until an admin has approved the provider
  if (reviewStatus !== 'approved') {
    return (
      <section aria-label={t('providerDetail.proofTier.sectionTitle')}>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <HugeHalalIcon aria-hidden className="h-6 w-6 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">{t('providerDetail.proofTier.pendingReview')}</p>
        </div>
      </section>
    );
  }

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
  const checkItems = getCheckItems(tier, verificationMethod);
  const nextTier = NEXT_TIER[tier];
  return (
    <section aria-label={t('providerDetail.proofTier.sectionTitle')}>
      <SealRow
        activeTier={tier}
        altText={t(`providerDetail.proofTier.sealAlt${capitalize(tier)}`)}
      />

      <SummaryText text={t(summaryKey)} />

      {/* Section 1: What we verified (collapsible) */}
      <button
        aria-expanded={isVerifiedExpanded}
        className="mt-3 flex items-center gap-2 text-base font-medium text-content-heading"
        type="button"
        onClick={() => setIsVerifiedExpanded((prev) => !prev)}
      >
        {t('providerDetail.proofTier.whatWeVerified')}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform ${isVerifiedExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isVerifiedExpanded ? (
        <div className="mt-2">
          <VerifiedChecklist items={checkItems} t={t} />
        </div>
      ) : null}

      {/* Section 2: What's missing for [next tier] (hidden for gold) */}
      {nextTier ? (
        <>
          <button
            aria-expanded={isMissingExpanded}
            className="mt-3 flex items-center gap-2 text-base font-medium text-content-heading"
            type="button"
            onClick={() => setIsMissingExpanded((prev) => !prev)}
          >
            {t('providerDetail.proofTier.whatsMissing', {
              nextTier: capitalize(nextTier),
            })}
            <ChevronDown
              aria-hidden
              className={`h-4 w-4 transition-transform ${isMissingExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {isMissingExpanded ? (
            <div className="mt-2">
              <VerifiedChecklist items={getCheckItems(nextTier, verificationMethod)} t={t} />
            </div>
          ) : null}
        </>
      ) : null}

      {/* Section 3: How do we check? (collapsed, prose per tier) */}
      <button
        aria-expanded={isExpanded}
        className="mt-3 flex items-center gap-2 text-base font-medium text-content-heading"
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {t('providerDetail.proofTier.howWeCheck')}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded ? (
        <p className="mt-2 text-sm text-content">
          {t(`providerDetail.proofTier.howWeCheck${capitalize(tier)}`)}
        </p>
      ) : null}

      <p className="mt-2 rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-800">
        {t('providerDetail.proofTier.disclaimer')}
      </p>

      <div className="bg-surface-secondary mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-content/50">
        <Lock aria-hidden className="h-4 w-4" />
        <p className="text-sm italic">{t('providerDetail.proofTier.comingSoonSlaughter')}</p>
      </div>

      {tier === 'gold' && supportsAttestation ? (
        <GoldAttestationSection
          noAlcohol={noAlcohol}
          noGambling={noGambling}
          noPork={noPork}
          t={t}
        />
      ) : null}
    </section>
  );
}
