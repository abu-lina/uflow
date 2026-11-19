// @vitest-environment jsdom
/**
 * #937 AC1: SearchBar strips unknown filter keys from URL on first render.
 * Red phase — this test MUST fail before migration and pass after.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { navMock } = vi.hoisted(() => ({
  navMock: {
    searchParams: new URLSearchParams(),
    pathname: '/food',
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navMock.pathname,
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => navMock.searchParams,
}));

vi.mock('@/providers/search-provider', () => ({
  useSearch: () => ({
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedLocation: '',
    setSelectedLocation: vi.fn(),
    selectedSection: 'food',
    setSelectedSection: vi.fn(),
  }),
  LOCATION_ALL: '',
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'search.ariaLabel': 'Search',
        'search.placeholder': 'Search in your Ummah',
        'common.delete': 'Delete',
        'suchen.accordions.filter': 'Filter',
        'suchen.clearAll': 'Clear all',
        'suchen.filter.items.muslim.title': 'Muslim-owned',
        'suchen.nearMe.chipLabel': 'Near Me',
        'suchen.nearMe.ariaLabel': 'Toggle near me',
        'suchen.openNow.chipLabel': 'Open Now',
        'suchen.openNow.ariaLabel': 'Toggle open now',
        'search.locationAll': 'Everywhere',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    coords: null,
    requestLocation: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/services/providers', () => ({
  fetchAvailableFilters: vi.fn(() =>
    Promise.resolve([
      { key: 'muslim', count: 5 },
      { key: 'spenden', count: 3 },
      { key: 'notakey', count: 2 },
    ]),
  ),
  fetchSearchSuggestions: vi.fn(() => Promise.resolve([])),
  fetchProviderCities: vi.fn(() => Promise.resolve([])),
  fetchFilteredCities: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/souks', () => ({
  searchSouksAndZakat: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/services/categories', () => ({
  fetchFilteredCategories: vi.fn(() => Promise.resolve([])),
  fetchUsedCategories: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ data: [], error: null }) }),
    }),
  },
}));

vi.mock('@/utils/errorUtils', () => ({
  logSupabaseError: vi.fn(),
}));

vi.mock('@/features/search/utils/nearMePermissionHint', () => ({
  getNearMePermissionHintKey: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  navMock.searchParams = new URLSearchParams();
  navMock.pathname = '/food';
});

describe('#937 AC1: SearchBar strips unknown filter keys from URL', () => {
  it('with filters=muslim,notakey only "muslim" is selected from first render', async () => {
    navMock.searchParams = new URLSearchParams('filters=muslim,notakey');

    const { SearchBar } = await import('@/features/search/components/SearchBar');
    render(<SearchBar customCities={['Berlin']} />);

    // The filter button text is "Filter: N" when filters are selected.
    // findByRole with exact text avoids matching the tier chip.
    // Bug: "Filter: 2" (both kept). After fix: "Filter: 1" (only valid key).
    const filterButton = await screen.findByText(/^Filter: \d/);
    expect(filterButton.textContent).toBe('Filter: 1');
  });
});

// ── AC2: readDiscoveryQueryInBrowser parity (pure function, no mocks needed) ──

describe('#937 AC2: readDiscoveryQueryInBrowser parity', () => {
  it('reads all discovery params from a URL with every param set', async () => {
    const { readDiscoveryQueryInBrowser } = await import('@/features/search/discoveryQuery');
    const params = new URLSearchParams(
      'q=kebab&location=Berlin&filters=muslim,spenden&status=approved&near_me=1&open_now=1&view=map&tier=gold',
    );

    const dq = readDiscoveryQueryInBrowser('/food', params);

    expect(dq.q).toBe('kebab');
    expect(dq.location).toBe('Berlin');
    expect(dq.filters).toEqual(['muslim', 'spenden']);
    expect(dq.status).toBe('approved');
    expect(dq.nearMe).toBe(true);
    expect(dq.openNow).toBe(true);
    expect(dq.view).toBe('map');
    expect(dq.tier).toBe('gold');
    expect(dq.section).toBe('food');
  });

  it('strips unknown filter keys (same validation as AC1)', async () => {
    const { readDiscoveryQueryInBrowser } = await import('@/features/search/discoveryQuery');
    const params = new URLSearchParams('filters=muslim,notakey');
    const dq = readDiscoveryQueryInBrowser('/food', params);

    expect(dq.filters).toEqual(['muslim']);
  });
});

// ── AC3: no hand-read of discovery params in migrated files ────────────

describe('#937 AC3: no direct query string reads for discovery params', () => {
  const PROJECT_ROOT = resolve(__dirname, '../../../../');

  function readSource(relPath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relPath), 'utf-8');
  }

  it('SearchBar.tsx does not read discovery params from searchParams directly', () => {
    const source = readSource('src/features/search/components/SearchBar.tsx');

    expect(source).toContain('readDiscoveryQueryInBrowser');

    expect(source).not.toMatch(/\.get\(['"]filters['"]\).*split/);
    expect(source).not.toMatch(/\.get\(['"]near_me['"]\)/);
    expect(source).not.toMatch(/\.get\(['"]open_now['"]\)/);
    expect(source).not.toMatch(/\.get\(['"]tier['"]\)/);
  });

  it('useMapDiscovery.ts does not read open_now or view from searchParams directly', () => {
    const source = readSource('src/features/search/hooks/useMapDiscovery.ts');

    expect(source).not.toMatch(/\.get\(['"]open_now['"]\)/);
    expect(source).not.toMatch(/\.get\(['"]view['"]\)/);
  });

  it('ProvidersContent.tsx does not read near_me from searchParams directly', () => {
    const source = readSource('src/app/(public)/providers/ProvidersContent.tsx');

    expect(source).not.toMatch(/searchParams\.get\(['"]near_me['"]\)/);
  });
});
