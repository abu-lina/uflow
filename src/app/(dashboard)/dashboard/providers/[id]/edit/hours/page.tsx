'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';
import type { OpeningHours, OpeningHoursDay } from '@/types/openingHours';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function EditHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_hours_${id}`;

  const [hours, setHours] = useState<OpeningHours>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHours(JSON.parse(stored));
        return;
      } catch { /* ignore */ }
    }

    fetch(`/api/admin/providers/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.data?.opening_hours) {
          setHours(json.data.opening_hours);
        }
      })
      .catch(() => {});
  }, [STORAGE_KEY, id]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hours));
    router.back();
  }, [hours, STORAGE_KEY, router]);

  const setDayHours = (day: string, value: OpeningHoursDay) => {
    setHours(prev => ({ ...prev, [day]: value }));
  };

  const copyFromPrevious = (dayIndex: number) => {
    if (dayIndex === 0) return;
    const prevDay = DAYS[dayIndex - 1];
    const currentDay = DAYS[dayIndex];
    setHours(prev => ({ ...prev, [currentDay]: prev[prevDay] ?? null }));
  };

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Opening Hours" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-4 overflow-y-auto">
        <div className="flex flex-col gap-2">
          {DAYS.map((day, i) => {
            const dayHours = hours[day] ?? null;
            const isClosed = dayHours === null;

            return (
              <div key={day} className="flex items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                <div className="w-24 text-sm font-medium text-[#272727]">{DAY_LABELS[day]}</div>

                <label className="flex items-center gap-1 text-xs text-[#999999]">
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setDayHours(day, null);
                      } else {
                        setDayHours(day, { open: '09:00', close: '17:00' });
                      }
                    }}
                  />
                  Closed
                </label>

                {!isClosed && dayHours && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      className="w-20 text-xs text-[#272727] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => setDayHours(day, { ...dayHours, open: e.target.value })}
                    />
                    <span className="text-xs text-[#999999]">—</span>
                    <input
                      className="w-20 text-xs text-[#272727] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => setDayHours(day, { ...dayHours, close: e.target.value })}
                    />
                  </div>
                )}

                {i > 0 && (
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100"
                    title={`Copy from ${DAY_LABELS[DAYS[i - 1]]}`}
                    type="button"
                    onClick={() => copyFromPrevious(i)}
                  >
                    <Icon className="h-4 w-4 text-[#999999]" icon="material-symbols:content-copy" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
