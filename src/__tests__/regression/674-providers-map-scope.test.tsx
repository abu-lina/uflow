// @vitest-environment jsdom
/**
 * #674 AC5: the section route asks the map for the same section, city and
 * filters as its list, so pins stay a subset of the list.
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { nav, mockGetMapLocations } = vi.hoisted(() => ({
  nav: { pathname: '/food', search: '' },
  mockGetMapLocations: vi.fn(async () => []),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/services/providers', () => ({
  getMapLocations: mockGetMapLocations,
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => ({
    data: { pages: [{ results: [], hasMore: false }] },
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: () => <header />,
}));
vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: () => <div />,
}));
vi.mock('@/features/search/components/SearchMap', () => ({ SearchMap: () => <div /> }));
vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => <div />,
}));
vi.mock('@/features/search/components/SearchContextBar', () => ({
  SearchContextBar: () => <div />,
}));
vi.mock('@/features/search/hooks/useNearMe', () => ({
  useNearMe: () => ({ isActive: false, results: [], isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({ status: 'idle', coords: null, requestLocation: vi.fn(), reset: vi.fn() }),
}));
vi.mock('@/components/shared/MobileGreetingHeader', () => ({ MobileGreetingHeader: () => <div /> }));
vi.mock('@/components/ui/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div /> }));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => <div /> }));
vi.mock('@/components/shared/LegalLinksModal', () => ({ LegalLinksModal: () => null }));
vi.mock('@/features/admin/components/AdminStatusFilter', () => ({ AdminStatusFilter: () => <div /> }));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => ({ isAdmin: false }) }));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/providers/search-provider', () => ({
  LOCATION_ALL: '',
  useSearch: () => ({
    selectedCategory: null,
    setSelectedCategory: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedLocation: '',
    setSelectedLocation: vi.fn(),
    selectedSection: 'food',
    setSelectedSection: vi.fn(),
  }),
}));

import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = '/food';
  nav.search = '';
});

describe('#674 AC5: section route map uses the list scope', () => {
  it('passes the list filters to the map pin query', async () => {
    nav.search = 'view=map&filters=muslim,parken';

    render(<ProvidersContent initialSection="food" />);

    await waitFor(() =>
      expect(mockGetMapLocations).toHaveBeenCalledWith(
        expect.objectContaining({ section: 'food', filters: ['muslim', 'parken'] }),
      ),
    );
  });

  it('passes the list city (?location=) to the map pin query', async () => {
    nav.search = 'view=map&location=Berlin';

    render(<ProvidersContent initialSection="food" />);

    await waitFor(() =>
      expect(mockGetMapLocations).toHaveBeenCalledWith(
        expect.objectContaining({ section: 'food', city: 'Berlin' }),
      ),
    );
  });

  it('passes the route city (/food/[city]) to the map pin query', async () => {
    nav.pathname = '/food/berlin';
    nav.search = 'view=map';

    render(<ProvidersContent defaultLocation="Berlin" initialSection="food" mapCity="Berlin" />);

    await waitFor(() =>
      expect(mockGetMapLocations).toHaveBeenCalledWith(
        expect.objectContaining({ section: 'food', city: 'Berlin' }),
      ),
    );
  });
});
