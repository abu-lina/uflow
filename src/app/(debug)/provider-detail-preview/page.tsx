'use client';

import { useMemo, useState } from 'react';

import { ProviderDetailPage } from '@/components/providers/ProviderDetailPage';
import type { Provider } from '@/services/providers';

const BASE_PROVIDER: Provider = {
  provider_id: 'preview-halal-kitchen-001',
  provider_name: 'Al Noor Halal Kitchen',
  description:
    'Family-run halal kitchen focused on Levantine comfort food and community-friendly service.',
  category_id: 'food',
  address_city: 'Berlin',
  address_street: 'Sonnenallee 100',
  address_zip: '12045',
  address_country: 'Germany',
  contact_phone: '+49 30 1234567',
  contact_email: 'salam@alnoor-kitchen.test',
  social_website: 'https://example.com/al-noor-kitchen',
  social_instagram: 'alnoor_kitchen',
  location_latitude: 52.481,
  location_longitude: 13.424,
  provider_images: JSON.stringify({
    urls: ['/images/placeholder.jpg', '/images/Home.png'],
  }),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  offers_ids: ['offer-1', 'offer-2'],
  needs_ids: [],
  offers: [{ name_de: 'Lamm Shawarma' }, { name_de: 'Falafel Teller' }],
  needs: [],
  category: {
    name_de: 'Restaurant',
    name_en: 'Restaurant',
  },
  listing_type: 'food',
  verification_method: 'onsite',
  has_certificate: false,
  no_alcohol: true,
  no_pork: true,
  no_gambling: false,
  muslim_owned: true,
  family_friendly: true,
  women_friendly: true,
  has_prayer_space: true,
  makes_donations: true,
  economic_solidarity: false,
  has_parking: false,
  opening_hours: {
    monday: { open: '11:00', close: '22:00' },
    tuesday: { open: '11:00', close: '22:00' },
    wednesday: { open: '11:00', close: '22:00' },
    thursday: { open: '11:00', close: '22:00' },
    friday: { open: '11:00', close: '23:00' },
    saturday: { open: '12:00', close: '23:00' },
    sunday: { open: '12:00', close: '21:00' },
  },
};

const VERIFICATION_OPTIONS: Array<{
  label: string;
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
}> = [
  { label: 'Online', verificationMethod: 'online', hasCertificate: false },
  { label: 'Online + Certificate', verificationMethod: 'online', hasCertificate: true },
  { label: 'On-site', verificationMethod: 'onsite', hasCertificate: false },
  { label: 'On-site + Certificate', verificationMethod: 'onsite', hasCertificate: true },
];

export default function ProviderDetailPreviewPage() {
  const [selectedOption, setSelectedOption] = useState(VERIFICATION_OPTIONS[2]);

  const previewProvider = useMemo(
    () => ({
      ...BASE_PROVIDER,
      verification_method: selectedOption.verificationMethod,
      has_certificate: selectedOption.hasCertificate,
    }),
    [selectedOption],
  );

  return (
    <div className="relative min-h-screen bg-[#f4f7f6]">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-content-heading">Provider Detail Preview</p>
          <div className="flex flex-wrap gap-2">
            {VERIFICATION_OPTIONS.map((option) => {
              const isActive =
                selectedOption.verificationMethod === option.verificationMethod &&
                selectedOption.hasCertificate === option.hasCertificate;
              return (
                <button
                  key={option.label}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'border-[#2B6D66] bg-[#E3F2EF] text-[#1D5C57]'
                      : 'border-border/70 bg-white text-content hover:bg-[#F8FBF9]'
                  }`}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ProviderDetailPage provider={previewProvider} />
    </div>
  );
}
