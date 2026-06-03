import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { computeSealTier, ProofTierCard } from '../ProofTierCard';

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

describe('computeSealTier', () => {
  it('[TDD gate] returns bronze for online, no certificate', () => {
    expect(computeSealTier('online', false)).toBe('bronze');
    expect(computeSealTier('online', null)).toBe('bronze');
    expect(computeSealTier(null, false)).toBe('bronze');
    expect(computeSealTier(undefined, undefined)).toBe('bronze');
  });

  it('[TDD gate] returns silver for onsite, no certificate', () => {
    expect(computeSealTier('onsite', false)).toBe('silver');
    expect(computeSealTier('onsite', null)).toBe('silver');
    expect(computeSealTier('onsite', undefined)).toBe('silver');
  });

  it('[TDD gate] returns gold whenever hasCertificate is true', () => {
    expect(computeSealTier('online', true)).toBe('gold');
    expect(computeSealTier('onsite', true)).toBe('gold');
    expect(computeSealTier(null, true)).toBe('gold');
    expect(computeSealTier(undefined, true)).toBe('gold');
  });
});

describe('ProofTierCard', () => {
  it('[TDD gate] renders 3 seal images/fallbacks in a group', () => {
    const { container } = render(
      <ProofTierCard verificationMethod="online" hasCertificate={false} />,
    );
    const sealGroup = container.querySelector('[role="group"]');
    expect(sealGroup).toBeInTheDocument();
    // There should be 3 seal visuals (img elements or fallback divs)
    const imgs = container.querySelectorAll('img[data-src]');
    expect(imgs).toHaveLength(3);
  });

  it('[TDD gate] active seal carries alt text with tier meaning from translation key', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    // Bronze tier is active — alt text uses translation key for bronze
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
  });

  it('[TDD gate] defaults to bronze (online/no-cert) when verification data is missing', () => {
    render(<ProofTierCard verificationMethod={null} hasCertificate={undefined} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkMenuReviewed')).toBeInTheDocument();
    expect(
      screen.queryByText('providerDetail.proofTier.checkCertificateOnFile'),
    ).not.toBeInTheDocument();
  });

  it('[TDD gate] renders silver seal as active for onsite/no-cert', () => {
    render(<ProofTierCard verificationMethod="onsite" hasCertificate={false} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltSilver')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOnsiteVisit')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkOwnerConfirmed')).toBeInTheDocument();
  });

  it('[TDD gate] renders gold seal as active for any hasCertificate=true', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={true} />);
    expect(screen.getByAltText('providerDetail.proofTier.sealAltGold')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
  });

  it('[TDD gate] renders summary sentence translation key for current tier', () => {
    const { rerender } = render(
      <ProofTierCard verificationMethod="online" hasCertificate={false} />,
    );
    expect(screen.getByText('providerDetail.proofTier.summaryBronze')).toBeInTheDocument();

    rerender(<ProofTierCard verificationMethod="onsite" hasCertificate={false} />);
    expect(screen.getByText('providerDetail.proofTier.summarySilver')).toBeInTheDocument();

    rerender(<ProofTierCard verificationMethod="onsite" hasCertificate={true} />);
    expect(screen.getByText('providerDetail.proofTier.summaryGoldCert')).toBeInTheDocument();

    rerender(<ProofTierCard verificationMethod="online" hasCertificate={true} />);
    expect(screen.getByText('providerDetail.proofTier.summaryGoldCertOnly')).toBeInTheDocument();
  });

  it('[TDD gate] does NOT render old arc SVG', () => {
    const { container } = render(
      <ProofTierCard verificationMethod="online" hasCertificate={false} />,
    );
    expect(container.querySelector('svg path[data-segment]')).not.toBeInTheDocument();
  });

  it('[TDD gate] does NOT render dimension chip rows', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    expect(
      screen.queryByText('providerDetail.proofTier.dimensionCheckMethod'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('providerDetail.proofTier.dimensionCertificate'),
    ).not.toBeInTheDocument();
  });

  it('[TDD gate] shows attestation section for gold tier with any declaration', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="food"
        noAlcohol={true}
        noGambling={false}
        noPork={false}
        verificationMethod="onsite"
      />,
    );
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
  });

  it('[TDD gate] does NOT show attestation for non-gold tier even with declarations', () => {
    render(
      <ProofTierCard
        hasCertificate={false}
        listingType="food"
        noAlcohol={true}
        noGambling={false}
        noPork={false}
        verificationMethod="online"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  it('[TDD gate] does NOT show attestation for gold tier with no declarations', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="food"
        noAlcohol={false}
        noGambling={false}
        noPork={false}
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  it('[TDD gate] does NOT show attestation for gold tier with ummah listing type', () => {
    render(
      <ProofTierCard
        hasCertificate={true}
        listingType="ummah"
        noAlcohol={true}
        noGambling={false}
        noPork={false}
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  it('[TDD gate] retains checklist and expandable explanation', () => {
    render(<ProofTierCard verificationMethod="online" hasCertificate={false} />);
    expect(screen.getByText('providerDetail.proofTier.whatWeVerified')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'providerDetail.proofTier.whatIsThis' }),
    ).toBeInTheDocument();
  });
});
