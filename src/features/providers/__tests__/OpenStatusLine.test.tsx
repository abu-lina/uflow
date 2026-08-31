import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/__tests__/utils/test-utils';
import { OpenStatusLine } from '@/features/providers/components/OpenStatusLine';
import type { Provider } from '@/services/providers';

describe('OpenStatusLine', () => {
  beforeEach(() => {
    // Pin to Wednesday 10:00 UTC so opening-hours resolution is deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-09T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProvider: Provider = {
    provider_id: 'prov-1',
    provider_name: 'Test',
    provider_images: null,
    category_id: null,
    address_city: 'Berlin',
    social_website: null,
    social_instagram: null,
    contact_email: null,
    contact_phone: null,
    address_street: null,
    address_country: null,
    address_zip: null,
    location_latitude: null,
    location_longitude: null,
    created_at: null,
    updated_at: null,
    offers_ids: [],
    needs_ids: [],
  };

  it('uses provider-level opening_hours when no locationId given', () => {
    const provider = {
      ...defaultProvider,
      opening_hours: {
        monday: { open: '09:00', close: '17:00' },
      },
    };
    const { container } = render(<OpenStatusLine provider={provider} />);
    expect(container.querySelector('.font-inter')).toBeInTheDocument();
  });

  it('uses location-specific opening_hours when locationId matches', () => {
    const provider = {
      ...defaultProvider,
      opening_hours: null,
      locations: [
        {
          location_id: 'loc-1',
          provider_id: 'prov-1',
          location_name: 'Berlin',
          address_street: null,
          address_zip: null,
          address_city: null,
          address_country: null,
          location_latitude: null,
          location_longitude: null,
          opening_hours: {
            monday: { open: '10:00', close: '18:00' },
          },
          show_address: true,
          contact_phone: null,
          is_primary: true,
          created_at: null,
          updated_at: null,
        },
      ],
    };
    const { container } = render(<OpenStatusLine provider={provider} locationId="loc-1" />);
    expect(container.querySelector('.font-inter')).toBeInTheDocument();
  });

  it('falls back to provider hours when locationId does not match any location', () => {
    const provider = {
      ...defaultProvider,
      opening_hours: {
        monday: { open: '09:00', close: '17:00' },
      },
      locations: [
        {
          location_id: 'loc-1',
          provider_id: 'prov-1',
          location_name: 'Berlin',
          address_street: null,
          address_zip: null,
          address_city: null,
          address_country: null,
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
    const { container } = render(<OpenStatusLine provider={provider} locationId="loc-2" />);
    expect(container.querySelector('.font-inter')).toBeInTheDocument();
  });

  it('returns null when no hours are available', () => {
    const provider = {
      ...defaultProvider,
      opening_hours: null,
    };
    const { container } = render(<OpenStatusLine provider={provider} />);
    expect(container.innerHTML).toBe('');
  });
});
