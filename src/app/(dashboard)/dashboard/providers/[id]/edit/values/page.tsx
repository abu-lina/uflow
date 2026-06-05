'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';

interface ValuesData {
  muslimOwned: boolean;
  familyFriendly: boolean;
  womenFriendly: boolean;
  childrenFriendly: boolean;
  hasPrayerSpace: boolean;
  hasParking: boolean;
  makesDonations: boolean;
  economicSolidarity: boolean;
  noAlcohol: boolean;
  noPork: boolean;
  noGambling: boolean;
}

const DEFAULT_VALUES: ValuesData = {
  muslimOwned: false,
  familyFriendly: false,
  womenFriendly: false,
  childrenFriendly: false,
  hasPrayerSpace: false,
  hasParking: false,
  makesDonations: false,
  economicSolidarity: false,
  noAlcohol: false,
  noPork: false,
  noGambling: false,
};

interface ToggleGroup {
  title: string;
  fields: { key: keyof ValuesData; label: string; icon: string }[];
}

function ToggleSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-gray-200'}`}
      id={id}
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function EditValuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_values_${id}`;

  const [values, setValues] = useState<ValuesData>(DEFAULT_VALUES);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setValues({ ...DEFAULT_VALUES, ...JSON.parse(stored) });
        return;
      } catch { /* ignore */ }
    }

    fetch(`/api/admin/providers/${id}`)
      .then(res => res.json())
      .then(json => {
        const p = json.data;
        if (!p) return;
        const fp = p.food_providers;
        const sp = p.store_providers;
        setValues({
          muslimOwned: p.muslim_owned ?? false,
          familyFriendly: p.family_friendly ?? false,
          womenFriendly: p.women_friendly ?? false,
          childrenFriendly: p.children_friendly ?? false,
          hasPrayerSpace: p.has_prayer_space ?? false,
          hasParking: p.has_parking ?? false,
          makesDonations: p.makes_donations ?? false,
          economicSolidarity: p.economic_solidarity ?? false,
          noAlcohol: fp?.no_alcohol ?? false,
          noPork: fp?.no_pork ?? false,
          noGambling: fp?.no_gambling ?? sp?.no_gambling ?? false,
        });
      })
      .catch(() => {});
  }, [STORAGE_KEY, id]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    router.back();
  }, [values, STORAGE_KEY, router]);

  const toggle = (key: keyof ValuesData) => {
    setValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groups: ToggleGroup[] = [
    {
      title: 'General',
      fields: [
        { key: 'muslimOwned', label: 'Muslim-owned', icon: 'material-symbols:family-star' },
        { key: 'familyFriendly', label: 'Family-friendly', icon: 'material-symbols:family-restroom' },
        { key: 'womenFriendly', label: 'Women-friendly', icon: 'material-symbols:female' },
        { key: 'childrenFriendly', label: 'Children-friendly', icon: 'material-symbols:child-care' },
      ],
    },
    {
      title: 'Facilities',
      fields: [
        { key: 'hasPrayerSpace', label: 'Prayer space', icon: 'material-symbols:mosque' },
        { key: 'hasParking', label: 'Parking', icon: 'material-symbols:local-parking' },
      ],
    },
    {
      title: 'Social',
      fields: [
        { key: 'makesDonations', label: 'Makes donations', icon: 'material-symbols:volunteer-activism' },
        { key: 'economicSolidarity', label: 'Economic solidarity', icon: 'material-symbols:handshake' },
      ],
    },
    {
      title: 'Food-specific',
      fields: [
        { key: 'noAlcohol', label: 'No alcohol', icon: 'material-symbols:no-drinks' },
        { key: 'noPork', label: 'No pork', icon: 'material-symbols:no-food' },
      ],
    },
    {
      title: 'Store-specific',
      fields: [
        { key: 'noGambling', label: 'No gambling', icon: 'material-symbols:gambling' },
      ],
    },
  ];

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Values & Amenities" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-6 overflow-y-auto">
        {groups.map(group => (
          <div key={group.title} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-[#999999]">{group.title}</h3>
            {group.fields.map(field => (
              <div
                key={field.key}
                className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[#999999]" icon={field.icon} />
                  <span className="text-sm font-medium text-[#272727]">{field.label}</span>
                </div>
                <ToggleSwitch
                  checked={values[field.key]}
                  id={`toggle-${field.key}`}
                  onChange={() => toggle(field.key)}
                />
              </div>
            ))}
          </div>
        ))}
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
