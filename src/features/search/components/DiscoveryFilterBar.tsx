'use client';

import { MapPin, Clock } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import type { GeolocationStatus } from '@/hooks/useGeolocation';
import { getNearMePermissionHintKey } from '@/features/search/utils/nearMePermissionHint';

interface DiscoveryFilterBarProps {
  geoStatus: GeolocationStatus;
  nearMeActive: boolean;
  openNowActive: boolean;
  onToggleNearMe: () => void;
  onToggleOpenNow: () => void;
  className?: string;
  /** Optional admin-only content rendered inline with the filter bar. */
  adminSlot?: React.ReactNode;
}

/**
 * DiscoveryFilterBar — unified quick-filter chip row for discovery surfaces.
 *
 * Renders near-me + open-now chips in a single horizontally scrollable row.
 * An optional `adminSlot` lets callers (e.g. ProvidersContent) render
 * AdminStatusFilter inline. Delegates platform-specific permission hints to
 * the shared nearMePermissionHint helper.
 */
export function DiscoveryFilterBar({
  geoStatus,
  nearMeActive,
  openNowActive,
  onToggleNearMe,
  onToggleOpenNow,
  className = '',
  adminSlot,
}: DiscoveryFilterBarProps) {
  const { t } = useLanguage();

  const showPermissionDenied =
    nearMeActive && (geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout');
  const showPermissionDeniedHint = nearMeActive && geoStatus === 'denied';
  // Chip is "active" when location is granted, or when near-me is on from a
  // URL-driven state while geolocation is still idle. During prompting the chip
  // pulses but stays inactive until the user grants permission.
  const nearMeChipActive = geoStatus === 'granted' || (nearMeActive && geoStatus === 'idle');

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        <button
          aria-pressed={nearMeChipActive}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
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
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 font-inter-tight text-sm font-semibold uppercase tracking-wide transition-colors ${
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
