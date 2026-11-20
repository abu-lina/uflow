// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProviderCard } from './ProviderCard';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useOptimisticBookmark', () => ({
  useOptimisticBookmark: () => ({ handleBookmark: vi.fn(), isLoading: false }),
}));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => (key === 'providers.deliveryOnly' ? 'Delivery only' : key),
  }),
}));

const base = {
  provider_id: 'p-1',
  provider_name: 'Loco Chicken | Kiel',
  address_zip: '24103',
  address_city: 'Kiel',
  gradient: true,
} as unknown as Parameters<typeof ProviderCard>[0];

describe('#953 ProviderCard: virtual venue shows a translated "Delivery only" label', () => {
  it('replaces the raw import text with the label and keeps the city', () => {
    render(<ProviderCard {...base} address_street="This is a virtual venue" />);
    const badge = screen.getByTestId('delivery-only');
    expect(badge).toHaveTextContent('Delivery only');
    expect(badge).toHaveTextContent('Kiel');
    expect(screen.queryByText(/virtual venue/i)).toBeNull();
  });

  it('also detects the virtual venue on the primary location', () => {
    const locations = [
      { is_primary: true, address_street: 'Virtual Venue', address_city: 'Kiel' },
    ] as unknown as NonNullable<typeof base.locations>;
    render(<ProviderCard {...base} address_street={null} locations={locations} />);
    expect(screen.getByTestId('delivery-only')).toBeInTheDocument();
  });

  it('keeps the navigable address button for a real address', () => {
    render(<ProviderCard {...base} address_street="Holtenauer Str. 1" />);
    expect(screen.queryByTestId('delivery-only')).toBeNull();
    expect(screen.getByRole('button', { name: /Holtenauer Str\. 1/ })).toBeInTheDocument();
  });
});
