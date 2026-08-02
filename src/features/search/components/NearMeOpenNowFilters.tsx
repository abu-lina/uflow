'use client';

import { MapPin, Clock } from 'lucide-react';
import type { GeolocationStatus } from '@/hooks/useGeolocation';

export const RADIUS_OPTIONS_KM = [2, 5, 10] as const;

interface NearMeOpenNowFiltersProps {
  geoStatus: GeolocationStatus;
  nearMeActive: boolean;
  openNowActive: boolean;
  radiusKm: number;
  onToggleNearMe: () => void;
  onToggleOpenNow: () => void;
  onRadiusChange: (km: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * NearMeOpenNowFilters — quick-filter chip row for the public search page
 * (Plan 196, M4). Placed below the sticky SectionSelector, always visible
 * without expanding any accordion (owner-approved design decision — see
 * docs/design/196-near-me-open-now-prototype.html).
 *
 * "Near me" opens the geolocation flow (state owned by the parent via
 * useGeolocation) and reveals radius pills inline once location is granted.
 * "Open now" is a simple on/off toggle; card-level open/closed labels always
 * render via ProviderCard regardless of this toggle (Critic F5) — the toggle
 * only filters which results are shown.
 */
export function NearMeOpenNowFilters({
  geoStatus,
  nearMeActive,
  openNowActive,
  radiusKm,
  onToggleNearMe,
  onToggleOpenNow,
  onRadiusChange,
  t,
}: NearMeOpenNowFiltersProps) {
  const showPermissionDenied =
    nearMeActive && (geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout');
  // Show radius pills whenever near-me is active and geolocation hasn't failed —
  // includes 'idle' after a page reload where near params come from the URL.
  const showRadiusPills = nearMeActive && !showPermissionDenied;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          aria-pressed={nearMeActive}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            nearMeActive
              ? 'bg-primary text-white'
              : 'bg-neutral-light text-content-muted hover:text-content'
          }`}
          type="button"
          onClick={onToggleNearMe}
        >
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
          {t('suchen.nearMe.chipLabel')}
        </button>

        <button
          aria-pressed={openNowActive}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            openNowActive
              ? 'bg-primary text-white'
              : 'bg-neutral-light text-content-muted hover:text-content'
          }`}
          type="button"
          onClick={onToggleOpenNow}
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
          {t('suchen.openNow.chipLabel')}
        </button>
      </div>

      {showRadiusPills ? (
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-sm text-text-muted">{t('suchen.nearMe.radiusLabel')}</span>
          {RADIUS_OPTIONS_KM.map((km) => (
            <button
              key={km}
              aria-pressed={radiusKm === km}
              className={`rounded-md px-2.5 py-1 font-inter-tight text-sm font-semibold transition-colors ${
                radiusKm === km
                  ? 'bg-primary text-white'
                  : 'bg-neutral-100 text-text-secondary'
              }`}
              type="button"
              onClick={() => onRadiusChange(km)}
            >
              {km} km
            </button>
          ))}
        </div>
      ) : null}

      {showPermissionDenied ? (
        <p aria-live="polite" className="px-0.5 text-sm text-text-muted" role="status">
          {t('suchen.nearMe.permissionDenied')}
        </p>
      ) : null}
    </div>
  );
}
