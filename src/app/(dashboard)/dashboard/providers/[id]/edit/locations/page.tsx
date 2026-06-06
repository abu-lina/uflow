'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';
import type { Location } from '@/types/location';

interface LocationFormData {
  location_id: string;
  location_name: string;
  address_street: string;
  address_zip: string;
  address_city: string;
  address_country: string;
  contact_phone: string;
  show_address: boolean;
  is_primary: boolean;
}

function createDefaultLocation(): LocationFormData {
  return {
    location_id: crypto.randomUUID(),
    location_name: '',
    address_street: '',
    address_zip: '',
    address_city: '',
    address_country: '',
    contact_phone: '',
    show_address: true,
    is_primary: false,
  };
}

export default function EditLocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_locations_${id}`;

  const [locations, setLocations] = useState<LocationFormData[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLocations(parsed);
          return;
        }
      } catch { /* ignore */ }
    }

    async function fetchLocations() {
      try {
        const res = await fetch(`/api/admin/providers/${id}/locations`);
        if (res.ok) {
          const json = await res.json();
          const data = (json.data ?? []) as Location[];
          const mapped = data.map(loc => ({
            location_id: loc.location_id,
            location_name: loc.location_name ?? '',
            address_street: loc.address_street ?? '',
            address_zip: loc.address_zip ?? '',
            address_city: loc.address_city ?? '',
            address_country: loc.address_country ?? '',
            contact_phone: loc.contact_phone ?? '',
            show_address: loc.show_address,
            is_primary: loc.is_primary,
          }));
          setLocations(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        }
      } catch { /* ignore */ }
    }
    fetchLocations();
  }, [id, STORAGE_KEY]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    router.back();
  }, [locations, STORAGE_KEY, router]);

  const updateLocation = (index: number, field: string, value: unknown) => {
    setLocations(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'is_primary' && value === true) {
        for (let i = 0; i < next.length; i++) {
          if (i !== index) {
            next[i] = { ...next[i], is_primary: false };
          }
        }
      }
      return next;
    });
  };

  const removeLocation = (index: number) => {
    if (locations.length <= 1) return;
    setLocations(prev => prev.filter((_, i) => i !== index));
  };

  const addLocation = () => {
    setLocations(prev => [...prev, createDefaultLocation()]);
  };

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Locations" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {locations.map((loc, i) => (
            <div key={loc.location_id} className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm gap-2">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 text-[15px] font-medium text-[#272727] outline-none bg-transparent"
                  placeholder="Location name"
                  value={loc.location_name}
                  onChange={(e) => updateLocation(i, 'location_name', e.target.value)}
                />
                {locations.length > 1 && (
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50"
                    type="button"
                    onClick={() => removeLocation(i)}
                  >
                    <Icon className="h-5 w-5 text-red-400" icon="material-symbols:close-rounded" />
                  </button>
                )}
              </div>
              <input
                className="text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                placeholder="Street"
                value={loc.address_street}
                onChange={(e) => updateLocation(i, 'address_street', e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  placeholder="ZIP"
                  value={loc.address_zip}
                  onChange={(e) => updateLocation(i, 'address_zip', e.target.value)}
                />
                <input
                  className="flex-[2] text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  placeholder="City"
                  value={loc.address_city}
                  onChange={(e) => updateLocation(i, 'address_city', e.target.value)}
                />
              </div>
              <input
                className="text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                placeholder="Country"
                value={loc.address_country}
                onChange={(e) => updateLocation(i, 'address_country', e.target.value)}
              />
              <input
                className="text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                placeholder="Contact phone"
                type="tel"
                value={loc.contact_phone}
                onChange={(e) => updateLocation(i, 'contact_phone', e.target.value)}
              />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-[#999999]">
                  <input
                    type="checkbox"
                    checked={loc.show_address}
                    onChange={(e) => updateLocation(i, 'show_address', e.target.checked)}
                  />
                  Show address
                </label>
                <label className="flex items-center gap-2 text-xs text-[#999999]">
                  <input
                    type="checkbox"
                    checked={loc.is_primary}
                    onChange={(e) => updateLocation(i, 'is_primary', e.target.checked)}
                  />
                  Primary
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-3 py-3 shadow-sm hover:bg-gray-50"
          type="button"
          onClick={addLocation}
        >
          <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:add" />
          <span className="text-sm font-medium text-[#999999]">Add location</span>
        </button>
      </main>
      <FooterAction
        primaryButton={{
          label: 'Save',
          icon: 'material-symbols:save-outline',
          onClick: handleSave,
        }}
        secondaryButton={{
          icon: 'material-symbols:close',
          onClick: () => router.back(),
          'aria-label': 'Close',
        }}
      />
    </div>
  );
}
