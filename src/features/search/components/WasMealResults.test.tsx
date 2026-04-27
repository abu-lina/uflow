import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WasMealResults } from './WasMealResults';

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
    'suchen.was.searchPlaceholder': 'Was suchst du?',
    'suchen.was.loading': 'Suche laeuft...',
    'suchen.was.searchError': 'Suche nicht verfuegbar. Bitte versuche es erneut.',
    'suchen.was.noResults': 'Noch nichts gefunden - aber wir wachsen!',
    'suchen.was.notFoundEncouragement': 'Vielleicht bald verfuegbar.',
    'suchen.was.providerCount': `${variables?.count ?? 0} Restaurants`,
    'suchen.was.showAllDishes': 'Show all dishes',
  };
  return map[key] ?? key;
};

describe('WasMealResults (Plan 096)', () => {
  beforeEach(() => {
    enableSearchExpandShowAllPreview = false;
  });

  it('renders empty-query placeholder', () => {
    render(
      <WasMealResults
        items={[]}
        isLoading={false}
        isError={false}
        query=""
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Was suchst du?')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <WasMealResults
        items={[]}
        isLoading
        isError={false}
        query="doe"
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Suche laeuft...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <WasMealResults
        items={[]}
        isLoading={false}
        isError
        query="doe"
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Suche nicht verfuegbar. Bitte versuche es erneut.')).toBeInTheDocument();
  });

  it('renders result rows and calls onSelect on tap', () => {
    const onSelect = vi.fn();
    render(
      <WasMealResults
        items={[
          {
            offer_id: 'offer-1',
            name_de: 'Doener',
            name_en: 'Doner',
            provider_count: 3,
          },
        ]}
        isLoading={false}
        isError={false}
        query="doe"
        onSelect={onSelect}
        t={t}
      />,
    );

    expect(screen.getByText('Doener')).toBeInTheDocument();
    expect(screen.getByText('3 Restaurants')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Doener/ }));
    expect(onSelect).toHaveBeenCalledWith('Doener');
  });

  it('shows only first three dishes with show-all action when more exist', () => {
    enableSearchExpandShowAllPreview = true;

    render(
      <WasMealResults
        items={[
          { offer_id: 'offer-1', name_de: 'Doener', name_en: 'Doner', provider_count: 3 },
          { offer_id: 'offer-2', name_de: 'Pizza', name_en: 'Pizza', provider_count: 2 },
          { offer_id: 'offer-3', name_de: 'Falafel', name_en: 'Falafel', provider_count: 4 },
          { offer_id: 'offer-4', name_de: 'Lahmacun', name_en: 'Lahmacun', provider_count: 1 },
        ]}
        isLoading={false}
        isError={false}
        query="do"
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Doener')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Falafel')).toBeInTheDocument();
    expect(screen.queryByText('Lahmacun')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all dishes' }));

    expect(screen.getByText('Lahmacun')).toBeInTheDocument();
  });

  it('keeps show-all preview inactive by default behind feature flag', () => {
    render(
      <WasMealResults
        items={[
          { offer_id: 'offer-1', name_de: 'Doener', name_en: 'Doner', provider_count: 3 },
          { offer_id: 'offer-2', name_de: 'Pizza', name_en: 'Pizza', provider_count: 2 },
          { offer_id: 'offer-3', name_de: 'Falafel', name_en: 'Falafel', provider_count: 4 },
          { offer_id: 'offer-4', name_de: 'Lahmacun', name_en: 'Lahmacun', provider_count: 1 },
        ]}
        isLoading={false}
        isError={false}
        query="do"
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Lahmacun')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all dishes' })).not.toBeInTheDocument();
  });

  it('renders no-results encouragement', () => {
    render(
      <WasMealResults
        items={[]}
        isLoading={false}
        isError={false}
        query="doe"
        onSelect={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByText('Noch nichts gefunden - aber wir wachsen!')).toBeInTheDocument();
    expect(screen.getByText('Vielleicht bald verfuegbar.')).toBeInTheDocument();
  });
});
