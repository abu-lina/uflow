import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { mockProviders } from '../mocks/providerData';

describe('ProviderCard — Multi-Location (Plan 151)', () => {
  const mockOnClick = vi.fn();
  const mockOnBookmarkChange = vi.fn();
  const baseProvider = mockProviders[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads address from locations[0] when locations are provided', () => {
    const provider = {
      ...baseProvider,
      locations: [
        {
          location_id: 'loc-1',
          provider_id: baseProvider.provider_id,
          location_name: 'Berlin Mitte',
          address_street: 'Musterstr 42',
          address_zip: '10115',
          address_city: 'Berlin',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: true,
          created_at: null,
          updated_at: null,
        },
      ],
    };

    render(
      <ProviderCard
        {...provider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.getByText(/Musterstr 42/)).toBeInTheDocument();
    expect(screen.getByText(/10115 Berlin/)).toBeInTheDocument();
  });

  it('falls back to legacy address fields when locations is not available', () => {
    const provider = {
      ...baseProvider,
      locations: undefined,
      address_street: 'Altstr 10',
      address_zip: '20095',
      address_city: 'Hamburg',
    };

    render(
      <ProviderCard
        {...provider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.getByText(/Altstr 10/)).toBeInTheDocument();
    expect(screen.getByText(/20095 Hamburg/)).toBeInTheDocument();
  });

  it('shows "N Standorte" badge when locations.length > 1', () => {
    const provider = {
      ...baseProvider,
      locations: [
        {
          location_id: 'loc-1',
          provider_id: baseProvider.provider_id,
          location_name: 'Berlin Mitte',
          address_street: 'Hauptstr 1',
          address_zip: '10115',
          address_city: 'Berlin',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: true,
          created_at: null,
          updated_at: null,
        },
        {
          location_id: 'loc-2',
          provider_id: baseProvider.provider_id,
          location_name: 'Hamburg Hbf',
          address_street: 'Bahnhofstr 1',
          address_zip: '20095',
          address_city: 'Hamburg',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: false,
          created_at: null,
          updated_at: null,
        },
      ],
    };

    render(
      <ProviderCard
        {...provider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.getByText('2 Standorte')).toBeInTheDocument();
  });

  it('hides standorte badge when locations array has only one entry', () => {
    const provider = {
      ...baseProvider,
      locations: [
        {
          location_id: 'loc-1',
          provider_id: baseProvider.provider_id,
          location_name: 'Berlin',
          address_street: 'Hauptstr 1',
          address_zip: '10115',
          address_city: 'Berlin',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: true,
          created_at: null,
          updated_at: null,
        },
      ],
    };

    render(
      <ProviderCard
        {...provider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    expect(screen.queryByText(/Standorte/)).not.toBeInTheDocument();
  });

  it('uses primary location\'s address when multiple locations exist', () => {
    const provider = {
      ...baseProvider,
      locations: [
        {
          location_id: 'loc-1',
          provider_id: baseProvider.provider_id,
          location_name: 'Hamburg',
          address_street: 'Hafenstr 1',
          address_zip: '20095',
          address_city: 'Hamburg',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: true,
          created_at: null,
          updated_at: null,
        },
        {
          location_id: 'loc-2',
          provider_id: baseProvider.provider_id,
          location_name: 'Berlin',
          address_street: 'Hauptstr 1',
          address_zip: '10115',
          address_city: 'Berlin',
          address_country: 'DE',
          location_latitude: null,
          location_longitude: null,
          opening_hours: null,
          show_address: true,
          contact_phone: null,
          is_primary: false,
          created_at: null,
          updated_at: null,
        },
      ],
    };

    render(
      <ProviderCard
        {...provider}
        isBookmarked={false}
        onBookmarkChange={mockOnBookmarkChange}
      />,
    );

    // Should show Hamburg (primary) not Berlin
    expect(screen.getByText(/Hafenstr 1/)).toBeInTheDocument();
    expect(screen.getByText(/20095 Hamburg/)).toBeInTheDocument();
  });
});
