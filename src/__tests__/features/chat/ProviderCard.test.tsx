import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderCard } from '@/features/chat/components/ProviderCard';
import type { ProviderCardData } from '@/features/chat/types';

const mockProvider: ProviderCardData = {
  provider_id: 'prov-123',
  provider_name: 'Döner Haus Berlin',
  address_city: 'Berlin',
  category_name: 'Türkisch',
  listing_type: 'food',
  muslim_owned: true,
  has_prayer_space: true,
  family_friendly: false,
  women_friendly: false,
};

describe('ProviderCard', () => {
  it('renders provider name and city', () => {
    render(<ProviderCard provider={mockProvider} />);

    expect(screen.getByText('Döner Haus Berlin')).toBeInTheDocument();
    const cityElements = screen.getAllByText(/Berlin/);
    expect(cityElements.length).toBeGreaterThan(0);
  });

  it('renders Muslim-owned badge when applicable', () => {
    render(<ProviderCard provider={mockProvider} />);

    expect(screen.getByText(/Muslim/i)).toBeInTheDocument();
    expect(screen.getByText(/Gebetsraum/i)).toBeInTheDocument();
  });

  it('links to provider detail page', () => {
    render(<ProviderCard provider={mockProvider} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/providers/prov-123');
  });

  it('handles missing optional fields gracefully', () => {
    const minimalProvider: ProviderCardData = {
      provider_id: 'min-1',
      provider_name: 'Test Store',
      address_city: null,
      category_name: null,
      listing_type: 'store',
      muslim_owned: false,
      has_prayer_space: false,
      family_friendly: false,
      women_friendly: false,
    };

    render(<ProviderCard provider={minimalProvider} />);

    expect(screen.getByText('Test Store')).toBeInTheDocument();
  });
});
