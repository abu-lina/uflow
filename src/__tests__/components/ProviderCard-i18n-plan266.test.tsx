// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { render } from '../utils/test-utils';
import { ProviderCard } from '@/features/providers/components/ProviderCard';
import { mockProviders } from '../mocks/providerData';

const location = (id: string, city: string) => ({
  location_id: id,
  provider_id: mockProviders[0].provider_id,
  location_name: city,
  address_street: 'Hauptstr 1',
  address_zip: '10115',
  address_city: city,
  address_country: 'DE',
  location_latitude: null,
  location_longitude: null,
  opening_hours: null,
  show_address: true,
  contact_phone: null,
  is_primary: id === 'loc-1',
  created_at: null,
  updated_at: null,
});

describe('Plan 266 review: ProviderCard labels are translated', () => {
  beforeEach(() => {
    localStorage.setItem('preferred-language', 'de');
  });

  afterEach(() => {
    localStorage.removeItem('preferred-language');
  });

  it('[pre-fix FAILS] renders moderation, halal and location labels in German', async () => {
    render(
      <ProviderCard
        {...mockProviders[0]}
        certificate_url="https://example.com/cert.pdf"
        has_certificate={true}
        isBookmarked={false}
        listing_type="food"
        locations={[location('loc-1', 'Berlin'), location('loc-2', 'Hamburg')]}
        mode="moderation"
        verification_method="onsite"
        onApprove={() => {}}
        onBookmarkChange={() => {}}
        onReject={() => {}}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Freigeben' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ablehnen' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Halal-Stufe 4' })).toBeInTheDocument();
    expect(screen.getByText('2 Standorte')).toBeInTheDocument();
  });

  it('[pre-fix FAILS] SearchBar Suspense fallback uses the translated placeholder', () => {
    const source = readFileSync(
      resolve(__dirname, '../../features/search/components/SearchBar.tsx'),
      'utf8',
    );
    expect(source).toContain("placeholder={t('search.placeholder')}");
    expect(source).not.toContain('placeholder="Search in your Ummah"');
  });
});
