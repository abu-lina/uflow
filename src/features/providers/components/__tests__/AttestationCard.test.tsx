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
  noAlcohol?: boolean,
  noPork?: boolean,
  noGambling?: boolean,
) {
  return render(
    <AttestationCard
      listingType={listingType}
      noAlcohol={noAlcohol}
      noPork={noPork}
      noGambling={noGambling}
    />,
  );
}

describe('AttestationCard', () => {
  it('renders all three labels for food provider when all values are true', () => {
    renderCard('food', true, true, true);

    expect(screen.getByText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.subtitle')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
  });

  it('renders only noAlcohol label when only noAlcohol is true', () => {
    renderCard('food', true, false, false);

    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noPork')).not.toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noGambling')).not.toBeInTheDocument();
  });

  it('renders only noPork label when only noPork is true', () => {
    renderCard('food', false, true, false);

    expect(screen.getByText('providerDetail.attestation.noPork')).toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noGambling')).not.toBeInTheDocument();
  });

  it('renders only noGambling label when only noGambling is true', () => {
    renderCard('food', false, false, true);

    expect(screen.getByText('providerDetail.attestation.noGambling')).toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noAlcohol')).not.toBeInTheDocument();
    expect(screen.queryByText('providerDetail.attestation.noPork')).not.toBeInTheDocument();
  });

  it('renders card for store listing type when at least one value is true', () => {
    renderCard('store', true, false, false);

    expect(screen.getByText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.noAlcohol')).toBeInTheDocument();
  });

  it('returns null for food listing type when all values are false', () => {
    const { container } = renderCard('food', false, false, false);

    expect(container.firstChild).toBeNull();
  });

  it('returns null for food listing type when all values are undefined', () => {
    const { container } = renderCard('food', undefined, undefined, undefined);

    expect(container.firstChild).toBeNull();
  });

  it('returns null for ummah listing type even when values are true', () => {
    const { container } = renderCard('ummah', true, true, true);

    expect(container.firstChild).toBeNull();
  });

  it('returns null for undefined listing type even when values are true', () => {
    const { container } = renderCard(undefined, true, true, true);

    expect(container.firstChild).toBeNull();
  });

  it('uses translation keys from useLanguage() for rendered text', () => {
    renderCard('food', true, false, false);

    expect(screen.getByText('providerDetail.attestation.title')).toBeInTheDocument();
    expect(screen.getByText('providerDetail.attestation.subtitle')).toBeInTheDocument();
  });
});
