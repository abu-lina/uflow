import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WasMealResults } from './WasMealResults';

const t = (key: string, variables?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'suchen.was.searchPlaceholder': 'Was suchst du?',
    'suchen.was.loading': 'Suche laeuft...',
    'suchen.was.searchError': 'Suche nicht verfuegbar. Bitte versuche es erneut.',
    'suchen.was.noResults': 'Noch nichts gefunden - aber wir wachsen!',
    'suchen.was.notFoundEncouragement': 'Vielleicht bald verfuegbar.',
    'suchen.was.providerCount': `${variables?.count ?? 0} Restaurants`,
  };
  return map[key] ?? key;
};

describe('WasMealResults (Plan 096)', () => {
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
