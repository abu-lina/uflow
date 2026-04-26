import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FilterSection } from './FilterSection';

const t = (key: string) => {
  const map: Record<string, string> = {
    'suchen.filter.items.muslim.title': 'Inhaber ist Muslim',
    'suchen.filter.items.muslim.subtitle': 'Muslimischer Inhaber',
    'suchen.filter.items.spenden.title': 'Spendet fuer Gute Zwecke',
    'suchen.filter.items.spenden.subtitle': 'Spendet fuer Gute Zwecke',
    'suchen.filter.items.solidaritaet.title': 'Unterstuetzt Muslime',
    'suchen.filter.items.solidaritaet.subtitle': 'Solidaritaet mit der Ummah',
    'suchen.filter.items.parken.title': 'Bietet Parkmoeglichkeiten',
    'suchen.filter.items.parken.subtitle': 'Parkplaetze vorhanden',
    'suchen.filter.items.gebet.title': 'Bietet Gebetsmoeglichkeiten',
    'suchen.filter.items.gebet.subtitle': 'Gebetsraum vorhanden',
  };

  return map[key] ?? key;
};

describe('FilterSection', () => {
  it('renders five filter rows and toggles by key', () => {
    const onToggleFilter = vi.fn();

    render(
      <FilterSection
        selectedFilters={[]}
        t={t}
        onToggleFilter={onToggleFilter}
      />
    );

    expect(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Spendet fuer Gute Zwecke/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Unterstuetzt Muslime/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bietet Parkmoeglichkeiten/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bietet Gebetsmoeglichkeiten/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i }));

    expect(onToggleFilter).toHaveBeenCalledWith('muslim');
  });
});
