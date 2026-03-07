'use client';

import { CityEarlyAccessEmptyState } from '@/components/shared/CityEarlyAccessEmptyState';
import { CityEarlyAccessNavbar } from '@/components/shared/CityEarlyAccessNavbar';

/**
 * Client wrapper for Stage 1 city content (Plan 035 — M2).
 *
 * Encapsulates the `handleReceiveUpdates` callback which requires
 * browser APIs (sessionStorage, localStorage, fetch). This keeps the
 * parent server component free of client-only code.
 */
export function CityStage1Content({
  cityName,
  country,
}: {
  cityName: string;
  country?: string | null;
}) {
  const handleReceiveUpdates = async () => {
    const email =
      sessionStorage.getItem('waitlistEmail') || localStorage.getItem('waitlistEmail') || '';
    const waitlistToken =
      sessionStorage.getItem('waitlistToken') || localStorage.getItem('waitlistToken') || '';

    if (!email) {
      throw new Error('Email not found');
    }

    const response = await fetch('/api/waitlist/subscribe-city', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        cityName,
        waitlistToken: waitlistToken || undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      throw new Error(result.error?.message || 'Failed to subscribe');
    }
  };

  return (
    <>
      <CityEarlyAccessEmptyState
        cityName={cityName}
        country={country ?? undefined}
        onReceiveUpdates={handleReceiveUpdates}
      />
      <div className="block md:hidden">
        <CityEarlyAccessNavbar />
      </div>
    </>
  );
}
