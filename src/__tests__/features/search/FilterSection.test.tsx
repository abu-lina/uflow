// @vitest-environment jsdom
/**
 * FilterSection: hide zero-count filters on mobile (Plan 233)
 *
 * Tests that FilterSection hides filter items when their count is 0,
 * shows counts next to labels, and falls back to showing all items
 * when no availableFilters prop is provided.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterSection } from '@/features/search/components/FilterSection';

// Stub lucide-react icons used by FilterSection
vi.mock('lucide-react', () => ({
  Moon: () => <span data-testid="icon-moon" />,
  HandHeart: () => <span data-testid="icon-hand-heart" />,
  HeartHandshake: () => <span data-testid="icon-heart-handshake" />,
  CircleParking: () => <span data-testid="icon-circle-parking" />,
  Check: () => <span data-testid="icon-check" />,
}));

vi.mock('@/components/icons/PrayerRug', () => ({
  PrayerRug: () => <span data-testid="icon-prayer-rug" />,
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => false,
}));

const t = (key: string) => {
  const map: Record<string, string> = {
    'suchen.filter.items.muslim.title': 'Muslim Owned',
    'suchen.filter.items.muslim.subtitle': 'Owned by Muslims',
    'suchen.filter.items.spenden.title': 'Accepts Donations',
    'suchen.filter.items.spenden.subtitle': 'Donates to good causes',
    'suchen.filter.items.solidaritaet.title': 'Solidarity Pricing',
    'suchen.filter.items.solidaritaet.subtitle': 'Supports the Ummah',
    'suchen.filter.items.parken.title': 'Has Parking',
    'suchen.filter.items.parken.subtitle': 'Parking available',
    'suchen.filter.items.gebet.title': 'Has Prayer Space',
    'suchen.filter.items.gebet.subtitle': 'Prayer room available',
  };
  return map[key] ?? key;
};

describe('FilterSection (Plan 233)', () => {
  it('hides filter items with count === 0', () => {
    render(
      <FilterSection
        availableFilters={[
          { key: 'muslim', count: 5 },
          { key: 'spenden', count: 0 },
          { key: 'solidaritaet', count: 3 },
        ]}
        selectedFilters={[]}
        selectedSection="food"
        t={t}
        onToggleFilter={() => {}}
      />,
    );

    expect(screen.getByText('Muslim Owned (5)')).toBeInTheDocument();
    expect(screen.getByText('Solidarity Pricing (3)')).toBeInTheDocument();
    expect(screen.queryByText(/Accepts Donations/)).not.toBeInTheDocument();
  });

  it('hides all filters when every count is 0', () => {
    render(
      <FilterSection
        availableFilters={[
          { key: 'muslim', count: 0 },
          { key: 'spenden', count: 0 },
          { key: 'solidaritaet', count: 0 },
        ]}
        selectedFilters={[]}
        selectedSection="food"
        t={t}
        onToggleFilter={() => {}}
      />,
    );

    expect(screen.queryByText(/Muslim Owned/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Accepts Donations/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solidarity Pricing/)).not.toBeInTheDocument();
  });

  it('shows all items when availableFilters is not provided (backward compat)', () => {
    render(
      <FilterSection selectedFilters={[]} selectedSection="food" t={t} onToggleFilter={() => {}} />,
    );

    // Without availableFilters, all 3 default items render (sliced to 3 when feature flag off)
    expect(screen.getByText('Muslim Owned')).toBeInTheDocument();
    expect(screen.getByText('Accepts Donations')).toBeInTheDocument();
    expect(screen.getByText('Solidarity Pricing')).toBeInTheDocument();
  });

  it('shows count next to filter label', () => {
    render(
      <FilterSection
        availableFilters={[
          { key: 'muslim', count: 12 },
          { key: 'spenden', count: 7 },
          { key: 'solidaritaet', count: 1 },
        ]}
        selectedFilters={[]}
        selectedSection="food"
        t={t}
        onToggleFilter={() => {}}
      />,
    );

    expect(screen.getByText('Muslim Owned (12)')).toBeInTheDocument();
    expect(screen.getByText('Accepts Donations (7)')).toBeInTheDocument();
    expect(screen.getByText('Solidarity Pricing (1)')).toBeInTheDocument();
  });

  it('renders only filters present in availableFilters (not all FILTER_ITEMS)', () => {
    // Only muslim has count > 0; the others aren't in the array at all
    render(
      <FilterSection
        availableFilters={[{ key: 'muslim', count: 2 }]}
        selectedFilters={[]}
        selectedSection="food"
        t={t}
        onToggleFilter={() => {}}
      />,
    );

    expect(screen.getByText('Muslim Owned (2)')).toBeInTheDocument();
    expect(screen.queryByText(/Accepts Donations/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Solidarity Pricing/)).not.toBeInTheDocument();
  });
});
