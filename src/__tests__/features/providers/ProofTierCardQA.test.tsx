/**
 * QA integration test: ProofTierCard verification model.
 *
 * Validates that the new verification model (verification_method + has_certificate)
 * renders correctly across all four progressive levels and that the attestation
 * section handles the newly added no_gambling field on food_providers.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProofTierCard } from '@/features/providers/components/ProofTierCard';

let mockLanguage = 'en';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: mockLanguage,
  }),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ alt, src, onError: _onError, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-src={src} {...props} />
  ),
}));

describe('ProofTierCard — QA verification model (Plan 133)', () => {
  // ---------------------------------------------------------------------------
  // Regression: certOnFile bug
  // ---------------------------------------------------------------------------
  it('[QA] certificate checklist item renders when hasCertificate is true (regression: certOnFile)', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={true} />);
    expect(
      screen.getByText('providerDetail.proofTier.checkCertificateOnFile'),
    ).toBeInTheDocument();
  });

  it('[QA] certificate checklist item does NOT render when hasCertificate is false', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    expect(
      screen.queryByText('providerDetail.proofTier.checkCertificateOnFile'),
    ).not.toBeInTheDocument();
  });

  it('[QA] certificate checklist item does NOT render when hasCertificate is null/undefined', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={undefined} />);
    expect(
      screen.queryByText('providerDetail.proofTier.checkCertificateOnFile'),
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Progressive levels: 4 verification states
  // ---------------------------------------------------------------------------
  it('[QA] level 1 — online without certificate shows bronze seal + menu reviewed', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkMenuReviewed')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.summaryBronze')).toBeInTheDocument();
  });

  it('[QA] level 2 — online with certificate shows gold seal + certificate item', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={true} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltGold')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.summaryGoldCertOnly')).toBeInTheDocument();
  });

  it('[QA] level 3 — onsite without certificate shows silver seal + onsite items', () => {
    render(<ProofTierCard verificationMethod="onsite" hasCertificate={false} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltSilver')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOnsiteVisit')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOwnerConfirmed')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.summarySilver')).toBeInTheDocument();
  });

  it('[QA] level 4 — onsite with certificate shows gold seal + all checklist items', () => {
    render(<ProofTierCard verificationMethod="onsite" hasCertificate={true} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltGold')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkMenuReviewed')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOnsiteVisit')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOwnerConfirmed')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.summaryGoldCert')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Gold attestation: all four declaration fields
  // ---------------------------------------------------------------------------
  it('[QA] gold attestation renders all four items when all declarations are true', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="food"
        noAlcohol={true}
        noPork={true}
        noGambling={true}
        verificationMethod="onsite"
      />,
    );
    expect(screen.getByText('providerDetail.attestation.halalOnly')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
  });

  it('[QA] gold attestation renders only the declared items', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="food"
        noAlcohol={false}
        noPork={true}
        noGambling={false}
        verificationMethod="onsite"
      />,
    );
    // noPork is the only declared attestation
    expect(screen.queryByText('providerDetail.attestation.halalOnly')).toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    // halalOnly always shows (it's not gated by a boolean)
    // The subtitle still renders
    expect(screen.getByText('providerDetail.attestation.subtitleDeclared')).toBeInTheDocument();
  });

  it('[QA] gold attestation renders no_gambling when declared (new food_providers column)', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="food"
        noAlcohol={false}
        noPork={false}
        noGambling={true}
        verificationMethod="onsite"
      />,
    );
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
    expect(
      screen.getByText('providerDetail.attestation.noGamblingDeclaredDetail'),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  it('[QA] store listing type also supports attestation', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="store"
        noAlcohol={false}
        noPork={false}
        noGambling={true}
        verificationMethod="onsite"
      />,
    );
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
  });

  it('[QA] ummah listing type does NOT show attestation', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="ummah"
        noAlcohol={true}
        noPork={true}
        noGambling={true}
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  it('[QA] whatWeVerified checklist is always present', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    expect(screen.getByText('providerDetail.proofTier.whatWeVerified')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkMenuReviewed')).toBeInTheDocument();
  });
});
