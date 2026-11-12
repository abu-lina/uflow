// @vitest-environment jsdom
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
  });

  it('[TDD gate] returns null when verificationMethod is nullish and hasCertificate is falsy', () => {
    expect(computeSealTier(null, false)).toBeNull();
    expect(computeSealTier(undefined, undefined)).toBeNull();
    expect(computeSealTier(null, null)).toBeNull();
    expect(computeSealTier(null, undefined)).toBeNull();
    expect(computeSealTier(undefined, false)).toBeNull();
  });

  it('[TDD gate] returns silver for onsite, no certificate', () => {
    expect(computeSealTier('onsite', false)).toBe('silver');
    expect(computeSealTier('onsite', null)).toBe('silver');
    expect(computeSealTier('onsite', undefined)).toBe('silver');
  });

  it('[TDD gate] returns gold when a real certificate is on file (AC6.8)', () => {
    const url = 'https://cdn.example.com/cert.pdf';
    expect(computeSealTier('online', true, undefined, url)).toBe('gold');
    expect(computeSealTier('onsite', true, undefined, url)).toBe('gold');
    expect(computeSealTier(null, true, undefined, url)).toBe('gold');
    expect(computeSealTier(undefined, true, undefined, url)).toBe('gold');
  });

  it('a bare hasCertificate without a certificateUrl earns no gold (AC6.8)', () => {
    // Old contract: the toggle alone produced 'gold'.
    expect(computeSealTier('online', true)).not.toBe('gold');
    expect(computeSealTier(null, true)).toBeNull();
    expect(computeSealTier('onsite', true, undefined, null)).toBe('silver');
  });

  it('returns null when attestation is provided but no questions answered', () => {
    expect(
      computeSealTier('online', false, { noAlcohol: false, noPork: false, noGambling: false }),
    ).toBeNull();
    expect(
      computeSealTier('onsite', false, { noAlcohol: false, noPork: false, noGambling: false }),
    ).toBeNull();
  });

  it('returns bronze/silver when attestation has at least one answer', () => {
    expect(
      computeSealTier('online', false, { noAlcohol: true, noPork: false, noGambling: false }),
    ).toBe('bronze');
    expect(
      computeSealTier('onsite', false, { noAlcohol: true, noPork: false, noGambling: false }),
    ).toBe('silver');
  });

  it('returns gold with certificate regardless of attestation', () => {
    expect(
      computeSealTier(
        'online',
        true,
        { noAlcohol: false, noPork: false, noGambling: false },
        'https://cdn.example.com/cert.pdf',
      ),
    ).toBe('gold');
  });
});

describe('ProofTierCard', () => {
  it('[TDD gate] renders combined seal image', () => {
    const { container } = render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const sealGroup = container.querySelector('[role="group"]');
    expect(sealGroup).toBeInTheDocument();
    // There should be 3 seal visuals (img elements or fallback divs)
    const imgs = container.querySelectorAll('img[data-src]');
    expect(imgs).toHaveLength(1);
  });

  it('[TDD gate] active seal carries alt text with tier meaning from translation key', () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    // Bronze tier is active — alt text uses translation key for bronze
    expect(screen.getByAltText('providerDetail.proofTier.sealAltBronze')).toBeInTheDocument();
  });

  it('[TDD gate] renders nothing when verification data is missing (null tier)', () => {
    const { container } = render(
      <ProofTierCard verificationMethod={null} hasCertificate={undefined} />,
    );
    // No seal tier = no output
    expect(container.innerHTML).toBe('');
  });

  it('[TDD gate] renders silver seal as active for onsite/no-cert', async () => {
    render(
      <ProofTierCard
        verificationMethod="onsite"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.getByAltText('providerDetail.proofTier.sealAltSilver')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /whatWeVerified/ });
    await toggle.click();
    expect(
      screen.getByText('providerDetail.proofTier.checkMenuReviewedOnsite'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('providerDetail.proofTier.checkSellsProcessNoAlcohol'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('providerDetail.proofTier.checkSellsProcessNoPork'),
    ).toBeInTheDocument();
    expect(screen.getByText('providerDetail.proofTier.checkMeatIsHalal')).toBeInTheDocument();
  });

  it('[TDD gate] renders gold seal as active for a real certificate on file', async () => {
    render(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="online"
      />,
    );
    expect(screen.getByAltText('providerDetail.proofTier.sealAltGold')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /whatWeVerified/ });
    await toggle.click();
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
  });

  it('[TDD gate] renders summary sentence translation key for current tier', () => {
    const { rerender } = render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.getByText('providerDetail.proofTier.summaryBronze')).toBeInTheDocument();

    rerender(
      <ProofTierCard
        verificationMethod="onsite"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.getByText('providerDetail.proofTier.summarySilver')).toBeInTheDocument();

    rerender(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="onsite"
      />,
    );
    expect(screen.getByText('providerDetail.proofTier.summaryGoldCert')).toBeInTheDocument();

    rerender(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="online"
      />,
    );
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
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        listingType="food"
        noAlcohol={true}
        noGambling={false}
        noPork={false}
        reviewStatus="approved"
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
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        listingType="food"
        noAlcohol={false}
        noGambling={false}
        noPork={false}
        reviewStatus="approved"
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  it('[TDD gate] does NOT show attestation for gold tier with ummah listing type', () => {
    render(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        listingType="ummah"
        noAlcohol={true}
        noGambling={false}
        noPork={false}
        reviewStatus="approved"
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Section 2: "What's missing for [next tier]" (collapsible)
  // ---------------------------------------------------------------------------

  it('[TDD gate] bronze hides "what\'s missing" — all silver categories already covered', () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.queryByRole('button', { name: /whatsMissing/ })).not.toBeInTheDocument();
  });

  it('[TDD gate] expanding "what\'s missing" for silver shows gold check items', async () => {
    render(
      <ProofTierCard
        verificationMethod="onsite"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const toggle = screen.getByRole('button', { name: /whatsMissing/ });
    await toggle.click();
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
  });

  it('[TDD gate] gold tier has NO "what\'s missing" section', () => {
    render(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="onsite"
      />,
    );
    expect(screen.queryByRole('button', { name: /whatsMissing/ })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Section 3: "How do we check?" (collapsible, prose per tier)
  // ---------------------------------------------------------------------------

  it('[TDD gate] howWeCheck is a collapsible toggle button', () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const toggle = screen.getByRole('button', { name: /howWeCheck/ });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('[TDD gate] expanding howWeCheck for bronze shows bronze prose', async () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const toggle = screen.getByRole('button', { name: /howWeCheck/ });
    await toggle.click();
    expect(screen.getByText('providerDetail.proofTier.howWeCheckBronze')).toBeInTheDocument();
    // No data-tier stepper nodes
    expect(screen.queryByText('providerDetail.proofTier.tierLabelBronze')).not.toBeInTheDocument();
  });

  it('[TDD gate] expanding howWeCheck for silver shows silver prose', async () => {
    render(
      <ProofTierCard
        verificationMethod="onsite"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const toggle = screen.getByRole('button', { name: /howWeCheck/ });
    await toggle.click();
    expect(screen.getByText('providerDetail.proofTier.howWeCheckSilver')).toBeInTheDocument();
  });

  it('[TDD gate] expanding howWeCheck for gold shows gold prose', async () => {
    render(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="onsite"
      />,
    );
    const toggle = screen.getByRole('button', { name: /howWeCheck/ });
    await toggle.click();
    expect(screen.getByText('providerDetail.proofTier.howWeCheckGold')).toBeInTheDocument();
  });

  it('[TDD gate] howWeCheck prose content is hidden by default', () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.queryByText('providerDetail.proofTier.howWeCheckBronze')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Old stepper is gone: no data-tier attributes anywhere
  // ---------------------------------------------------------------------------

  it('[TDD gate] no data-tier stepper nodes exist', async () => {
    const { container } = render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    const toggle = screen.getByRole('button', { name: /howWeCheck/ });
    await toggle.click();
    expect(container.querySelector('[data-tier]')).not.toBeInTheDocument();
  });

  it('[TDD gate] coming soon row still renders', () => {
    render(
      <ProofTierCard
        verificationMethod="online"
        hasCertificate={false}
        noAlcohol={true}
        reviewStatus="approved"
      />,
    );
    expect(screen.getByText('providerDetail.proofTier.comingSoonSlaughter')).toBeInTheDocument();
  });

  it('[TDD gate] certificate-only gold checklist shows only gold items', async () => {
    render(
      <ProofTierCard
        certificateUrl="https://cdn.example.com/cert.pdf"
        hasCertificate={true}
        reviewStatus="approved"
        verificationMethod="online"
      />,
    );
    const toggle = screen.getByRole('button', { name: /whatWeVerified/ });
    await toggle.click();
    // VerifiedChecklist shows active tier items only — gold with online has just certificate
    expect(screen.getByText('providerDetail.proofTier.checkCertificateOnFile')).toBeInTheDocument();
    // No silver onsite items
    expect(
      screen.queryByText('providerDetail.proofTier.checkMenuReviewedOnsite'),
    ).not.toBeInTheDocument();
    // No bronze items (checklist is per active tier)
    expect(
      screen.queryByText('providerDetail.proofTier.checkMenuReviewed'),
    ).not.toBeInTheDocument();
  });
});
