'use client';

import { MapPin, X } from 'lucide-react';
import { EmptyCityCard } from '@/features/search/components/EmptyCityCard';
import type { PopularCity } from '@/services/providers';

export interface WoRecentSearch {
  city: string;
}

interface WoCityResultsProps {
  popularCities: PopularCity[];
  recentSearches: WoRecentSearch[];
  filteredCities: PopularCity[];
  selectedCity: string | null;
  query: string;
  isLoading: boolean;
  isError: boolean;
  isCheckingCityValidity: boolean;
  isValidNoProviderCity: boolean | null;
  userEmail: string | null;
  onSelect: (city: string) => void;
  onClearSelection: () => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

function CityRow({
  city,
  providerCount,
  className,
  onSelect,
  t,
}: {
  city: string;
  providerCount: number;
  className?: string;
  onSelect: (city: string) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}) {
  const countLabel = t('suchen.wo.providerCount', { count: providerCount });

  return (
    <button
      aria-label={`${city} - ${countLabel}`}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-muted ${className ?? ''}`}
      type="button"
      onClick={() => onSelect(city)}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
        <MapPin aria-hidden="true" className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-inter-tight text-base font-semibold text-text-primary">{city}</p>
        <p className="truncate font-inter text-sm text-text-muted">{countLabel}</p>
      </div>
    </button>
  );
}

export function WoCityResults({
  popularCities,
  recentSearches,
  filteredCities,
  selectedCity,
  query,
  isLoading,
  isError,
  isCheckingCityValidity,
  isValidNoProviderCity,
  userEmail,
  onSelect,
  onClearSelection,
  t,
}: WoCityResultsProps) {
  if (isLoading) {
    return (
      <p className="py-2 text-center text-sm text-text-muted">
        {t('suchen.wo.loading')}
      </p>
    );
  }

  if (isError) {
    return (
      <p aria-live="polite" className="py-2 text-center text-sm text-danger" role="status">
        {t('suchen.wo.searchError')}
      </p>
    );
  }

  if (query.length < 2) {
    const countByCity = new Map(popularCities.map((entry) => [entry.city, entry.provider_count]));

    if (popularCities.length === 0 && recentSearches.length === 0 && !selectedCity) {
      return null;
    }

    return (
      <div className="mb-2">
        {selectedCity && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.wo.selectionLabel')}
            </p>
            <div className="space-y-1">
              <div className="flex h-[72px] w-full items-center justify-between rounded-xl bg-background-selection px-2 py-0">
                <CityRow
                  city={selectedCity}
                  className="h-full py-0 hover:bg-transparent"
                  providerCount={countByCity.get(selectedCity) ?? 0}
                  t={t}
                  onSelect={onSelect}
                />
                <button
                  aria-label={t('suchen.wo.removeSelection')}
                  className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary"
                  type="button"
                  onClick={onClearSelection}
                >
                  <X aria-hidden="true" className="h-3 w-3 text-white" />
                </button>
              </div>
            </div>
          </>
        )}

        {popularCities.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.wo.popularLabel')}
            </p>
            <div className="space-y-1">
              {popularCities.slice(0, 5).map((entry) => (
                <CityRow
                  key={`popular:${entry.city}`}
                  city={entry.city}
                  providerCount={entry.provider_count}
                  t={t}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </>
        )}

        {recentSearches.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.wo.recentLabel')}
            </p>
            <div className="space-y-1">
              {recentSearches.slice(0, 3).map((recent) => (
                <CityRow
                  key={`recent:${recent.city}`}
                  city={recent.city}
                  providerCount={countByCity.get(recent.city) ?? 0}
                  t={t}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (filteredCities.length > 0) {
    return (
      <div className="mt-4 space-y-1">
        {filteredCities.map((entry) => (
          <CityRow
            key={`filtered:${entry.city}`}
            city={entry.city}
            providerCount={entry.provider_count}
            t={t}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  if (isCheckingCityValidity || isValidNoProviderCity === null) {
    return (
      <p className="mt-4 py-2 text-center text-sm text-text-muted">
        {t('suchen.wo.loading')}
      </p>
    );
  }

  if (isValidNoProviderCity) {
    return <EmptyCityCard cityName={query} userEmail={userEmail} />;
  }

  return (
    <div className="mt-4 px-4 py-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-lg border border-border-light">
      <p className="text-sm text-text-muted text-center">{t('suchen.cityNotRecognized', { city: query })}</p>
    </div>
  );
}
