'use client';

import { ProviderCard } from '@/components/providers/ProviderCard';
import type { Provider } from '@/services/providers';

const sampleProvider: Provider = {
  provider_id: 'debug-provider-115',
  provider_name: 'Shawarma Haus Berlin',
  provider_images: null,
  category_id: 'debug-category-food',
  address_city: 'Berlin',
  social_website: 'https://example.com',
  social_instagram: null,
  contact_email: 'info@example.com',
  contact_phone: '+49 30 123456',
  address_street: 'Hermannplatz 4',
  address_country: 'Germany',
  address_zip: '10967',
  location_latitude: 52.489,
  location_longitude: 13.424,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  offers_ids: ['offer-1', 'offer-2', 'offer-3'],
  needs_ids: [],
  offers: [{ name_de: 'Shawarma' }, { name_de: 'Falafel' }, { name_de: 'Kebab' }],
  category: {
    name_de: 'Fast Food',
    name_en: 'Fast Food',
  },
  listing_type: 'food',
  verification_method: 'onsite',
  has_certificate: true,
  muslim_owned: true,
  family_friendly: true,
  women_friendly: true,
  has_prayer_space: false,
  makes_donations: false,
  economic_solidarity: false,
  opening_hours: {
    monday: { open: '10:00', close: '22:00' },
    tuesday: { open: '10:00', close: '22:00' },
    wednesday: { open: '10:00', close: '22:00' },
    thursday: { open: '10:00', close: '22:00' },
    friday: { open: '11:00', close: '23:00' },
    saturday: { open: '11:00', close: '23:00' },
    sunday: { open: '12:00', close: '21:00' },
  },
};

export default function ProviderCardExamplePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Provider Card Example (Plan 115)</h1>
        <p className="text-sm text-gray-600">
          This page is a local debug example so you can verify specialty tags and open status
          rendering.
        </p>

        <div className="max-w-md">
          <ProviderCard {...sampleProvider} hideActions />
        </div>
      </div>
    </main>
  );
}
