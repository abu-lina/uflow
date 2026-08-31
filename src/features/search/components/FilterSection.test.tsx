import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterSection } from './FilterSection';

let enableSearchExpandShowAllPreview = false;

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => {
    if (key === 'enableSearchExpandShowAllPreview') {
      return enableSearchExpandShowAllPreview;
    }
    return false;
  },
}));

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
    'suchen.filter.showAllFilters': 'Show all filters',
  };

  return map[key] ?? key;
};

describe('FilterSection', () => {
  beforeEach(() => {
    enableSearchExpandShowAllPreview = false;
  });

  it('renders first three filter rows with show-all action and toggles by key', () => {
    enableSearchExpandShowAllPreview = true;

    const onToggleFilter = vi.fn();

    render(
      <FilterSection
        selectedSection="food"
        selectedFilters={[]}
        t={t}
        onToggleFilter={onToggleFilter}
      />
    );

    expect(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Spendet fuer Gute Zwecke/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Unterstuetzt Muslime/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bietet Parkmoeglichkeiten/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bietet Gebetsmoeglichkeiten/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all filters' }));

    expect(screen.getByRole('checkbox', { name: /Bietet Parkmoeglichkeiten/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bietet Gebetsmoeglichkeiten/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i }));

    expect(onToggleFilter).toHaveBeenCalledWith('muslim');
  });

  it('hides muslim filter in business section', () => {
    render(
      <FilterSection
        selectedSection="store"
        selectedFilters={[]}
        t={t}
        onToggleFilter={vi.fn()}
      />
    );

    expect(screen.queryByRole('checkbox', { name: /Inhaber ist Muslim/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Spendet fuer Gute Zwecke/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Unterstuetzt Muslime/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bietet Parkmoeglichkeiten/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bietet Gebetsmoeglichkeiten/i })).not.toBeInTheDocument();
  });

  it('hides all provider filters in ummah section', () => {
    render(
      <FilterSection
        selectedSection="ummah"
        selectedFilters={[]}
        t={t}
        onToggleFilter={vi.fn()}
      />
    );

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('keeps show-all preview inactive by default behind feature flag', () => {
    render(
      <FilterSection
        selectedSection="food"
        selectedFilters={[]}
        t={t}
        onToggleFilter={vi.fn()}
      />
    );

    expect(screen.getByRole('checkbox', { name: /Inhaber ist Muslim/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Spendet fuer Gute Zwecke/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Unterstuetzt Muslime/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bietet Parkmoeglichkeiten/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bietet Gebetsmoeglichkeiten/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all filters' })).not.toBeInTheDocument();
  });
});
