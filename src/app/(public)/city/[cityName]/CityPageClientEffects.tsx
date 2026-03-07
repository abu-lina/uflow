'use client';

import { useEffect } from 'react';

/**
 * Client island that syncs the selected city to localStorage/sessionStorage
 * and dispatches a custom event for the useAppStage hook (Plan 035 — M2).
 *
 * Renders nothing — purely side-effects.
 */
export function CityPageClientEffects({ cityName }: { cityName: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem('selectedCity', cityName);
      localStorage.setItem('selectedCity', cityName);
      window.dispatchEvent(new CustomEvent('city-selected', { detail: { cityName } }));
    } catch (err) {
      console.error('[City Page] Failed to store city:', err);
    }
  }, [cityName]);

  return null;
}
