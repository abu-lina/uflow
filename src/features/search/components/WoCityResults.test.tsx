import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WoCityResults } from './WoCityResults';

let enableSearchExpandShowAllPreview = false;

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => {
    if (key === 'enableSearchExpandShowAllPreview') {
      return enableSearchExpandShowAllPreview;
    }
    return false;
  },
}));

const t = (key: string, variables?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'suchen.wo.loading': 'Suche laeuft...',
    'suchen.wo.searchError': 'Suche nicht verfuegbar',
    'suchen.wo.providerCount': `${variables?.count ?? 0} Anbieter`,
    'suchen.wo.popularLabel': 'BELIEBT',
    'suchen.wo.recentLabel': 'ZULETZT GESUCHT',
    'suchen.wo.selectionLabel': 'AUSWAHL',
    'suchen.wo.removeSelection': 'Auswahl entfernen',
    'suchen.wo.noResults': 'Keine Staedte gefunden',
    'suchen.cityNotRecognized': `${variables?.city ?? ''} ist uns nicht bekannt`,
    'suchen.wo.showAllCities': 'Show all cities',
  };

  return map[key] ?? key;
};

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: ({ cityName }: { cityName: string }) => <div>Empty city: {cityName}</div>,
}));

describe('WoCityResults (Plan 102)', () => {
  beforeEach(() => {
    enableSearchExpandShowAllPreview = false;
  });

  it('renders loading state', () => {
    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={true}
        isValidNoProviderCity={null}
        popularCities={[]}
        query=""
        recentSearches={[]}
        selectedCity={null}
        t={t}
        userEmail={null}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />, 
    );

    expect(screen.getByText('Suche laeuft...')).toBeInTheDocument();
  });

  it('renders only recent rows when recent searches exist', () => {
    const onSelect = vi.fn();

    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={null}
        popularCities={[
          { city: 'Berlin', provider_count: 12 },
          { city: 'Hamburg', provider_count: 8 },
        ]}
        query=""
        recentSearches={[{ city: 'Köln' }]}
        selectedCity={null}
        t={t}
        userEmail={null}
        onClearSelection={vi.fn()}
        onSelect={onSelect}
      />, 
    );

    expect(screen.getByText('ZULETZT GESUCHT')).toBeInTheDocument();
    expect(screen.queryByText('BELIEBT')).not.toBeInTheDocument();
    expect(screen.queryByText('Berlin')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Köln - 0 Anbieter' }));
    expect(onSelect).toHaveBeenCalledWith('Köln');
  });

  it('falls back to popular rows when no recent searches exist', () => {
    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={null}
        popularCities={[
          { city: 'Berlin', provider_count: 12 },
          { city: 'Hamburg', provider_count: 8 },
        ]}
        query=""
        recentSearches={[]}
        selectedCity={null}
        t={t}
        userEmail={null}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('BELIEBT')).toBeInTheDocument();
    expect(screen.queryByText('ZULETZT GESUCHT')).not.toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('12 Anbieter')).toBeInTheDocument();
  });

  it('[regression] shows max 3 popular cities when no recent searches exist', () => {
    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={null}
        popularCities={[
          { city: 'Berlin', provider_count: 12 },
          { city: 'Hamburg', provider_count: 8 },
          { city: 'Koeln', provider_count: 7 },
          { city: 'Bonn', provider_count: 3 },
        ]}
        query=""
        recentSearches={[]}
        selectedCity={null}
        t={t}
        userEmail={null}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Hamburg')).toBeInTheDocument();
    expect(screen.getByText('Koeln')).toBeInTheDocument();
    expect(screen.queryByText('Bonn')).not.toBeInTheDocument();
  });

  it('renders active selection row with remove action', () => {
    const onClearSelection = vi.fn();

    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={null}
        popularCities={[]}
        query=""
        recentSearches={[]}
        selectedCity="Berlin"
        t={t}
        userEmail={null}
        onClearSelection={onClearSelection}
        onSelect={vi.fn()}
      />, 
    );

    expect(screen.getByText('AUSWAHL')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl entfernen' }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders query-result state and empty-city fallback', () => {
    render(
      <WoCityResults
        filteredCities={[]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={true}
        popularCities={[]}
        query="Mannheim"
        recentSearches={[]}
        selectedCity={null}
        t={t}
        userEmail="user@example.com"
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />, 
    );

    expect(screen.getByText('Empty city: Mannheim')).toBeInTheDocument();
  });

  it('shows only first three query cities with show-all action when more exist', () => {
    enableSearchExpandShowAllPreview = true;

    render(
      <WoCityResults
        filteredCities={[
          { city: 'Berlin', provider_count: 12 },
          { city: 'Hamburg', provider_count: 8 },
          { city: 'Koeln', provider_count: 7 },
          { city: 'Bonn', provider_count: 3 },
        ]}
        isCheckingCityValidity={false}
        isError={false}
        isLoading={false}
        isValidNoProviderCity={null}
        popularCities={[]}
        query="be"
        recentSearches={[]}
        selectedCity={null}
        t={t}
        userEmail={null}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Hamburg')).toBeInTheDocument();
    expect(screen.getByText('Koeln')).toBeInTheDocument();
    expect(screen.queryByText('Bonn')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all cities' }));

    expect(screen.getByText('Bonn')).toBeInTheDocument();
  });
});
