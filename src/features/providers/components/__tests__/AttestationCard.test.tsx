import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttestationCard } from '../AttestationCard';
import type { Provider } from '@/services/providers';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

type ListingType = Provider['listing_type'];

function renderCard(
  listingType: ListingType,
  halalLevel?: number | null,
  noAlcohol?: boolean,
  noPork?: boolean,
  noGambling?: boolean,
) {
  return render(
    <AttestationCard
      listingType={listingType}
      halalLevel={halalLevel}
      noAlcohol={noAlcohol}
      noPork={noPork}
      noGambling={noGambling}
    />,
  );
}

describe('AttestationCard', () => {
  it('renders declared variant when at least one commitment is declared', () => {
    renderCard('food', 2, true, true, true);

    expect(screen.getByLabelText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.subtitleDeclared')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.halalOnly')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcoholDeclaredDetail')).toBeInTheDocument();
  });

  it('renders fallback variant when no commitment is declared', () => {
    renderCard('food', null, false, false, false);

    expect(screen.getByText('providerDetail.attestation.subtitleFallback')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.halalOnly')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcoholFallbackDetail')).toBeInTheDocument();
  });

  it('renders card for store listing type', () => {
    renderCard('store', null, false, false, true);

    expect(screen.getByLabelText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noGamblingDeclaredDetail')).toBeInTheDocument();
  });

  it('returns null for ummah listing type even when values are true', () => {
    const { container } = renderCard('ummah', 2, true, true, true);

    expect(container.firstChild).toBeNull();
  });

  it('returns null for undefined listing type even when values are true', () => {
    const { container } = renderCard(undefined, 2, true, true, true);

    expect(container.firstChild).toBeNull();
  });

  it('uses translation keys from useLanguage() for rendered text in declared state', () => {
    renderCard('food', 1, true, false, false);

    expect(screen.getByLabelText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.subtitleDeclared')).toBeInTheDocument();
  });
});
