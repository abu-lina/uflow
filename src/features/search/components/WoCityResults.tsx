'use client';

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { RowItem } from '@/components/ui/RowItem';
import { getFeatureFlag } from '@/config/feature-flags';
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
    <RowItem
      selectable
      ariaLabel={`${city} - ${countLabel}`}
      className={`transition-colors hover:bg-background-selection/50 focus:outline-none focus:ring-2 focus:ring-primary/30 ${className ?? ''}`}
      icon={
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-selection text-primary">
          <MapPin aria-hidden="true" className="h-6 w-6" />
        </div>
      }
      subtitle={countLabel}
      title={city}
      onSelect={() => onSelect(city)}
    />
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
  const isShowAllPreviewEnabled = getFeatureFlag('enableSearchExpandShowAllPreview');
  const [showAllPopularCities, setShowAllPopularCities] = useState(false);
  const [showAllRecentCities, setShowAllRecentCities] = useState(false);
  const [showAllFilteredCities, setShowAllFilteredCities] = useState(false);

  useEffect(() => {
    setShowAllPopularCities(false);
    setShowAllRecentCities(false);
    setShowAllFilteredCities(false);
  }, [query]);

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

    const visiblePopularCities = isShowAllPreviewEnabled
      ? (showAllPopularCities ? popularCities : popularCities.slice(0, 3))
      : popularCities.slice(0, 3);
    const visibleRecentSearches = isShowAllPreviewEnabled
      ? (showAllRecentCities ? recentSearches : recentSearches.slice(0, 3))
      : recentSearches.slice(0, 3);
    const shouldShowRecent = recentSearches.length > 0;
    const shouldShowPopular = !shouldShowRecent && popularCities.length > 0;
    const hasMorePopularCities = isShowAllPreviewEnabled && !showAllPopularCities && popularCities.length > 3;
    const hasMoreRecentSearches = isShowAllPreviewEnabled && !showAllRecentCities && recentSearches.length > 3;

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

        {shouldShowPopular && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.wo.popularLabel')}
            </p>
            <div className="space-y-1">
              {visiblePopularCities.map((entry) => (
                <CityRow
                  key={`popular:${entry.city}`}
                  city={entry.city}
                  providerCount={entry.provider_count}
                  t={t}
                  onSelect={onSelect}
                />
              ))}
            </div>
            {hasMorePopularCities ? (
              <button
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
                type="button"
                onClick={() => setShowAllPopularCities(true)}
              >
                {t('suchen.wo.showAllCities')}
              </button>
            ) : null}
          </>
        )}

        {shouldShowRecent && (
          <>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('suchen.wo.recentLabel')}
            </p>
            <div className="space-y-1">
              {visibleRecentSearches.map((recent) => (
                <CityRow
                  key={`recent:${recent.city}`}
                  city={recent.city}
                  providerCount={countByCity.get(recent.city) ?? 0}
                  t={t}
                  onSelect={onSelect}
                />
              ))}
            </div>
            {hasMoreRecentSearches ? (
              <button
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
                type="button"
                onClick={() => setShowAllRecentCities(true)}
              >
                {t('suchen.wo.showAllCities')}
              </button>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (filteredCities.length > 0) {
    return (
      <div className="mt-4 space-y-1">
        {(isShowAllPreviewEnabled ? (showAllFilteredCities ? filteredCities : filteredCities.slice(0, 3)) : filteredCities).map((entry) => (
          <CityRow
            key={`filtered:${entry.city}`}
            city={entry.city}
            providerCount={entry.provider_count}
            t={t}
            onSelect={onSelect}
          />
        ))}
        {isShowAllPreviewEnabled && !showAllFilteredCities && filteredCities.length > 3 ? (
          <button
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#eee] px-5 text-center font-inter-tight text-base font-medium text-text-primary shadow-[0px_8px_24px_0px_rgba(238,238,238,0.25)] transition-colors hover:bg-neutral-200"
            type="button"
            onClick={() => setShowAllFilteredCities(true)}
          >
            {t('suchen.wo.showAllCities')}
          </button>
        ) : null}
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
