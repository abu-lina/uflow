import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WoCityResults } from './WoCityResults';

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
  };

  return map[key] ?? key;
};

vi.mock('@/features/search/components/EmptyCityCard', () => ({
  EmptyCityCard: ({ cityName }: { cityName: string }) => <div>Empty city: {cityName}</div>,
}));

describe('WoCityResults (Plan 102)', () => {
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

  it('renders idle state with popular and recent rows', () => {
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

    expect(screen.getByText('BELIEBT')).toBeInTheDocument();
    expect(screen.getByText('ZULETZT GESUCHT')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('12 Anbieter')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Köln - 0 Anbieter' }));
    expect(onSelect).toHaveBeenCalledWith('Köln');
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
});
