'use client';

import { MapPin, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { GeolocationStatus } from '@/hooks/useGeolocation';
import { getNearMePermissionHintKey } from '@/features/search/utils/nearMePermissionHint';

export const RADIUS_OPTIONS_KM = [2, 5, 10] as const;

interface DiscoveryFilterBarProps {
  geoStatus: GeolocationStatus;
  nearMeActive: boolean;
  openNowActive: boolean;
  radiusKm: number;
  onToggleNearMe: () => void;
  onToggleOpenNow: () => void;
  onRadiusChange: (km: number) => void;
  className?: string;
  /** Optional admin-only content rendered inline with the filter bar. */
  adminSlot?: React.ReactNode;
}

/**
 * DiscoveryFilterBar — unified quick-filter chip row for discovery surfaces.
 *
 * Combines the near-me + open-now chips from HomeSearchBar with the 2/5/10 km
 * radius pills from NearMeOpenNowFilters. Delegates platform-specific permission
 * hints to the shared nearMePermissionHint helper. An optional `adminSlot` lets
 * callers (e.g. ProvidersContent) render AdminStatusFilter inline.
 */
export function DiscoveryFilterBar({
  geoStatus,
  nearMeActive,
  openNowActive,
  radiusKm,
  onToggleNearMe,
  onToggleOpenNow,
  onRadiusChange,
  className = '',
  adminSlot,
}: DiscoveryFilterBarProps) {
  const { t } = useLanguage();

  const showPermissionDenied =
    nearMeActive && (geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout');
  const showPermissionDeniedHint = nearMeActive && geoStatus === 'denied';
  const showRadiusPills = nearMeActive && !showPermissionDenied;
  // Chip is "active" when location is granted, or when near-me is on from a
  // URL-driven state while geolocation is still idle. During prompting the chip
  // pulses but stays inactive until the user grants permission.
  const nearMeChipActive = geoStatus === 'granted' || (nearMeActive && geoStatus === 'idle');

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-pressed={nearMeChipActive}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            nearMeChipActive
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
          }`}
          type="button"
          onClick={onToggleNearMe}
        >
          <MapPin
            aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 ${geoStatus === 'prompting' ? 'animate-pulse' : ''}`}
          />
          <span className={geoStatus === 'prompting' ? 'animate-pulse' : ''}>
            {t('suchen.nearMe.chipLabel')}
          </span>
        </button>

        <button
          aria-pressed={openNowActive}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
            openNowActive
              ? 'bg-primary text-white'
              : 'border border-gray-200 bg-white text-content-muted shadow-sm hover:border-gray-300 hover:text-content'
          }`}
          type="button"
          onClick={onToggleOpenNow}
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {t('suchen.openNow.chipLabel')}
        </button>

        {adminSlot}
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
          <span className="block">{t('suchen.nearMe.permissionDenied')}</span>
          {showPermissionDeniedHint ? (
            <span className="block text-xs">{t(getNearMePermissionHintKey())}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
