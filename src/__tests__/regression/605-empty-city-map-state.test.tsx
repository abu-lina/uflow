// @vitest-environment jsdom
/**
 * #605: the selected city sets the map camera only. The map shows pins from
 * all cities, the list stays city-scoped, and a city with no providers says so.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ar } from '@/translations/ar';
import { de } from '@/translations/de';
import { en } from '@/translations/en';
import { ps } from '@/translations/ps';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';

const { nav, mockGetMapLocations, query, mapProps, gridProps } = vi.hoisted(() => ({
  nav: { pathname: '/food', search: '' },
  mockGetMapLocations: vi.fn(),
  query: {
    options: undefined as { queryKey: unknown[]; queryFn: (ctx: object) => unknown } | undefined,
    state: {} as Record<string, unknown>,
  },
  mapProps: { current: undefined as Record<string, unknown> | undefined },
  gridProps: { current: undefined as Record<string, unknown> | undefined },
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
  useInfiniteQuery: (options: typeof query.options) => {
    query.options = options;
    return {
      data: { pages: [{ results: [], hasMore: false, totalCount: 0 }] },
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: vi.fn(),
      ...query.state,
    };
  },
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: () => <header />,
}));
vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: (props: Record<string, unknown>) => {
    gridProps.current = props;
    return <div data-testid="grid" />;
  },
}));
vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: (props: Record<string, unknown>) => {
    mapProps.current = props;
    return <div data-testid="map" />;
  },
}));
vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => <div />,
}));
vi.mock('@/features/search/components/SearchContextBar', () => ({
  SearchContextBar: () => <div />,
}));
vi.mock('@/features/search/hooks/useNearMe', () => ({
  useNearMe: () => ({
    isActive: false,
    results: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
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
vi.mock('@/components/shared/MobileGreetingHeader', () => ({
  MobileGreetingHeader: () => <div />,
}));
vi.mock('@/components/ui/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div /> }));
vi.mock('@/components/ui/Icon', () => ({ Icon: () => <div /> }));
vi.mock('@/components/shared/LegalLinksModal', () => ({ LegalLinksModal: () => null }));
vi.mock('@/features/admin/components/AdminStatusFilter', () => ({
  AdminStatusFilter: () => <div />,
}));
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

const WIEN = { lat: 48.2082, lng: 16.3738 };

function row(id: string, city: string, lat: number, lng: number) {
  return {
    provider_id: id,
    location_latitude: lat,
    location_longitude: lng,
    providers: { provider_name: id, listing_type: 'food', address_city: city },
  };
}

function renderMapForCity() {
  nav.pathname = '/food/wien';
  nav.search = 'view=map';
  return render(
    <ProvidersContent
      defaultLocation="Wien"
      initialSection="food"
      mapCenter={WIEN}
      mapCity="Wien"
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = '/food';
  nav.search = '';
  query.state = {};
  mapProps.current = undefined;
  gridProps.current = undefined;
  mockGetMapLocations.mockResolvedValue([]);
});

describe('#605 AC1: the map query is not filtered by the selected city', () => {
  it('omits the city from the pin query for ?location=', async () => {
    nav.search = 'view=map&location=Berlin';
    render(<ProvidersContent initialSection="food" />);

    await waitFor(() => expect(mockGetMapLocations).toHaveBeenCalled());
    const [options] = mockGetMapLocations.mock.calls[0];
    expect(options).toMatchObject({ section: 'food' });
    expect(options.city ?? null).toBeNull();
  });

  it('omits the city from the pin query on /food/[city]', async () => {
    renderMapForCity();

    await waitFor(() => expect(mockGetMapLocations).toHaveBeenCalled());
    const [options] = mockGetMapLocations.mock.calls[0];
    expect(options).toMatchObject({ section: 'food' });
    expect(options.city ?? null).toBeNull();
  });
});

describe('#605 AC2: the selected city only sets the initial camera', () => {
  it('focuses the map on the selected city and its center', async () => {
    renderMapForCity();

    await waitFor(() => expect(mapProps.current).toBeDefined());
    expect(mapProps.current?.focus).toEqual({ key: 'Wien', center: WIEN });
  });
});

describe('#605 AC3: zooming out shows pins from every city', () => {
  it('passes pins from all cities to the map while one city is selected', async () => {
    mockGetMapLocations.mockResolvedValue([
      row('p-berlin', 'Berlin', 52.52, 13.4),
      row('p-koeln', 'Köln', 50.94, 6.96),
    ]);
    nav.search = 'view=map&location=Berlin';
    render(<ProvidersContent initialSection="food" />);

    await waitFor(() => expect(mapProps.current?.pins).toHaveLength(2));
  });
});

describe('#605 AC4: the list stays city-scoped', () => {
  it('requests the list from the search API with the selected city', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [], hasMore: false, totalCount: 0 }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    nav.search = 'location=Berlin';
    render(<ProvidersContent initialSection="food" />);

    await query.options?.queryFn({ pageParam: 0 });

    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('location=Berlin');
    vi.unstubAllGlobals();
  });
});

describe('#605 AC5: a city with zero providers is centered and says so', () => {
  it('centers the map on the known city coordinates', async () => {
    renderMapForCity();

    await waitFor(() => expect(mapProps.current).toBeDefined());
    expect(mapProps.current?.focus).toEqual({ key: 'Wien', center: WIEN });
  });

  it('shows the localized empty message on the map', async () => {
    renderMapForCity();

    expect(await screen.findByText('providers.noResultsFound')).toBeTruthy();
    expect(screen.getByText('providers.noResultsDescription')).toBeTruthy();
  });

  it('shows the localized empty message in the list', async () => {
    nav.pathname = '/food/wien';
    nav.search = '';
    render(
      <ProvidersContent
        defaultLocation="Wien"
        initialSection="food"
        mapCenter={WIEN}
        mapCity="Wien"
      />,
    );

    await waitFor(() => expect(gridProps.current).toBeDefined());
    expect(gridProps.current).toMatchObject({
      items: [],
      isLoading: false,
      error: null,
      emptyTitle: 'providers.noResultsFound',
      emptyDescription: 'providers.noResultsDescription',
    });
  });

  it('does not show the empty message when the city has providers', async () => {
    query.state = {
      data: {
        pages: [{ results: [{ id: 'p1', provider_name: 'A' }], hasMore: false, totalCount: 1 }],
      },
    };
    renderMapForCity();

    await waitFor(() => expect(mapProps.current).toBeDefined());
    expect(screen.queryByText('providers.noResultsFound')).toBeNull();
  });
});

describe('#605 AC6: loading, error and zero-result states stay distinct', () => {
  it('shows no empty message while the list is loading', async () => {
    query.state = { isLoading: true, data: undefined };
    renderMapForCity();

    await waitFor(() => expect(mapProps.current).toBeDefined());
    expect(screen.queryByText('providers.noResultsFound')).toBeNull();
  });

  it('shows no empty message and no error while the pin request is pending', async () => {
    mockGetMapLocations.mockReturnValue(new Promise(() => {}));
    renderMapForCity();

    await waitFor(() => expect(mockGetMapLocations).toHaveBeenCalled());
    expect(screen.queryByText('providers.noResultsFound')).toBeNull();
    expect(screen.queryByText('providers.errorTitle')).toBeNull();
  });

  it('shows an error, not the empty message, when the list query fails', async () => {
    query.state = { error: new Error('boom'), data: undefined };
    renderMapForCity();

    expect(await screen.findByText('providers.errorTitle')).toBeTruthy();
    expect(screen.queryByText('providers.noResultsFound')).toBeNull();
  });

  it('shows an error, not the empty message, when the pin query fails', async () => {
    mockGetMapLocations.mockRejectedValue(new Error('pins down'));
    renderMapForCity();

    expect(await screen.findByText('providers.errorTitle')).toBeTruthy();
    expect(screen.queryByText('providers.noResultsFound')).toBeNull();
  });
});

describe('#605 AC7: strings exist in all six locales', () => {
  const locales = { ar, de, en, ps, tr, ur };
  const keys = ['noResultsFound', 'noResultsDescription', 'errorTitle', 'errorLoading'] as const;

  for (const [name, locale] of Object.entries(locales)) {
    it(`${name} defines the providers empty and error keys`, () => {
      for (const key of keys) {
        expect(typeof locale.providers[key]).toBe('string');
      }
    });
  }
});
