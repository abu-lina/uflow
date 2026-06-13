'use client';

import { Icon } from '@iconify/react';
import type { Location } from '@/types/location';
import { formatAddress } from '@/utils/navigationUtils';

interface LocationCardProps {
  location: Location;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function LocationCard({ location, isSelected = false, onSelect }: LocationCardProps) {
  const address = formatAddress(
    location.address_street ?? undefined,
    location.address_zip ?? undefined,
    location.address_city ?? undefined,
  );

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <button
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-white hover:border-primary/30 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {location.location_name && (
            <h4 className="font-inter-tight text-base font-semibold text-content-heading">
              {location.location_name}
            </h4>
          )}
          {location.is_primary && (
            <span className="mt-0.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Hauptstandort
            </span>
          )}
          {address && (
            <p className="mt-1 text-sm text-gray-600">{address}</p>
          )}
          {location.opening_hours && (
            <p className="mt-1 text-xs text-gray-500">
              <Icon className="mr-1 inline-block h-3 w-3" icon="mdi:clock-outline" />
              Öffnungszeiten verfügbar
            </p>
          )}
        </div>

        {mapsUrl && (
          <a
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary"
            href={mapsUrl}
            rel="noopener noreferrer"
            target="_blank"
            title="In Maps öffnen"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="h-4 w-4" icon="mdi:map-marker" />
          </a>
        )}
      </div>
    </button>
  );
}
