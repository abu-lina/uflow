// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const { mockUseSearchParams, mockSelectedLocationRef } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
  mockSelectedLocationRef: { current: '' },
}));

const { mockUseInfiniteQuery } = vi.hoisted(() => ({
  mockUseInfiniteQuery: vi.fn<(...args: unknown[]) => unknown>(() => ({
    data: { pages: [{ results: [], hasMore: false }] },
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
}));
const { mockIsAdmin, mockMapDiscovery, mockDiscoveryGrid } = vi.hoisted(() => ({
  mockIsAdmin: vi.fn(() => ({ isAdmin: false })),
  mockMapDiscovery: vi.fn(),
  mockDiscoveryGrid: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: mockUseInfiniteQuery,
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/providers',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('@/providers/search-provider', () => ({
  useSearch: () => ({
    selectedCategory: null,
    setSelectedCategory: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    get selectedLocation() {
      return mockSelectedLocationRef.current;
    },
    setSelectedLocation: vi.fn(),
    selectedSection: 'food',
    setSelectedSection: vi.fn(),
  }),
  LOCATION_ALL: '',
}));

vi.mock('@/features/providers/components/ProvidersPageHeader', () => ({
  ProvidersPageHeader: () => null,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/features/providers/components/SearchResultsList', () => ({
  SearchResultsList: () => null,
}));

vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: (props: Record<string, unknown>) => {
    mockDiscoveryGrid(props);
    return null;
  },
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: () => null,
}));

vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => null,
}));

vi.mock('@/features/search/components/SearchContextBar', () => ({
  SearchContextBar: () => null,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => null,
}));

vi.mock('@/features/search/components/ViewToggleButton', () => ({
  ViewToggleButton: () => null,
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

vi.mock('@/features/search/hooks/useMapDiscovery', () => ({
  useMapDiscovery: (_geolocation: unknown, _viewMode: unknown, selectedStatus: unknown) => {
    mockMapDiscovery(selectedStatus);
    return {
      pins: [],
      isOpenNow: false,
      setIsOpenNow: vi.fn(),
      viewMode: 'list',
      toggleViewMode: vi.fn(),
      hasOpenedMap: false,
      headerRef: { current: null },
      headerHeight: 0,
      userCoords: null,
    };
  },
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    coords: null,
    requestLocation: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: () => null,
}));

vi.mock('@/components/ui/SkeletonGrid', () => ({
  SkeletonGrid: () => null,
}));

vi.mock('@/components/shared/MobileGreetingHeader', () => ({
  MobileGreetingHeader: () => null,
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => null,
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'providers.adminFilterLabel': 'Admin Filter:',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => mockIsAdmin(),
}));

vi.mock('@/features/admin/components/AdminStatusFilter', () => ({
  AdminStatusFilter: () => null,
}));

vi.mock('@/components/shared/LegalLinksModal', () => ({
  LegalLinksModal: () => null,
}));

vi.mock('@/lib/supabase/client', () => {
  const chainable: Record<string, unknown> = {
    data: [],
    error: null,
    then: (resolve: (v: { data: never[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  chainable.eq = () => chainable;
  chainable.not = () => chainable;
  chainable.order = () => chainable;
  chainable.limit = () => chainable;
  chainable.select = () => chainable;
  return {
    supabase: { from: () => chainable },
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

function getQueryKeyLocation(): string {
  const firstArgs = mockUseInfiniteQuery.mock.calls[0];
  if (!firstArgs) return 'NO_CALL';
  const firstArg = firstArgs[0] as { queryKey: string[] } | undefined;
  if (!firstArg?.queryKey) return 'NO_CALL';
  return firstArg.queryKey[3] ?? 'NO_CALL';
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockSelectedLocationRef.current = '';
  mockIsAdmin.mockReturnValue({ isAdmin: false });
});

function mockSearchPage(reviewStatus: string) {
  mockUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        {
          results: [{ id: 'provider-1', name: 'Munchies', review_status: reviewStatus }],
          hasMore: false,
        },
      ],
    },
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: vi.fn(),
  });
}

function getSearchQueryOptions() {
  return mockUseInfiniteQuery.mock.calls[0]?.[0] as
    | {
        queryKey: unknown[];
        initialData?: unknown;
        queryFn: (context: { pageParam: number }) => Promise<unknown>;
      }
    | undefined;
}

describe('ProvidersContent location resolution (Plan 172)', () => {
  it('resolves to city name when URL has location=Berlin', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food&location=Berlin'));
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('Berlin');
  });

  it('resolves to LOCATION_ALL when URL has location=Everywhere', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food&location=Everywhere'));
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('');
  });

  it('resolves to LOCATION_ALL when URL has location=Überall', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food&location=Überall'));
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('');
  });

  it('resolves to LOCATION_ALL when URL has location= (empty)', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food&location='));
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('');
  });

  it('resolves to LOCATION_ALL when URL has no location param even if context is stale "Stuttgart"', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food'));
    mockSelectedLocationRef.current = 'Stuttgart';
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('');
  });

  it('resolves to LOCATION_ALL when URL has no location param and context is empty', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food'));
    mockSelectedLocationRef.current = '';
    render(<ProvidersContent />);
    expect(getQueryKeyLocation()).toBe('');
  });

  it('[post-fix PASSES] requests admin All without reusing approved SSR data and labels each row status', async () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true });
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('section=food&q=Munchies&location=Berlin&filters=muslim'),
    );
    mockSearchPage('pending');

    render(
      <ProvidersContent initialData={{ results: [], hasMore: false }} initialSection="food" />,
    );

    const queryOptions = getSearchQueryOptions();
    expect(queryOptions?.queryKey[4]).toBe('all');
    expect(queryOptions?.initialData).toBeUndefined();
    expect(mockMapDiscovery).toHaveBeenCalledWith(null);
    expect(mockDiscoveryGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        showReviewStatus: true,
        items: [expect.objectContaining({ review_status: 'pending' })],
      }),
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], hasMore: false, totalCount: 0 }),
    });
    vi.stubGlobal('fetch', mockFetch);
    await queryOptions?.queryFn({ pageParam: 0 });
    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]), 'http://localhost');
    expect(requestUrl.searchParams.get('q')).toBe('Munchies');
    expect(requestUrl.searchParams.get('location')).toBe('Berlin');
    expect(requestUrl.searchParams.get('filters')).toBe('muslim');
    expect(requestUrl.searchParams.get('section')).toBe('food');
    expect(requestUrl.searchParams.get('status')).toBe('all');
    vi.unstubAllGlobals();
  });

  it('[post-fix PASSES] normalizes status=all to the read-only All tab before map and card rendering', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true });
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=food&q=Munchies&status=all'));
    mockSearchPage('rejected');

    render(<ProvidersContent />);

    expect(getSearchQueryOptions()?.queryKey[4]).toBe('all');
    expect(mockMapDiscovery).toHaveBeenCalledWith(null);
    expect(mockDiscoveryGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        showReviewStatus: true,
        items: [expect.objectContaining({ review_status: 'rejected' })],
      }),
    );
  });

  it('[post-fix PASSES] keeps a specific status tab filtered, sends it to the map, and still shows the read-only status badge (#560)', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true });
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('section=food&q=Munchies&status=pending'),
    );
    mockSearchPage('pending');

    render(<ProvidersContent />);

    expect(getSearchQueryOptions()?.queryKey[4]).toBe('pending');
    expect(mockMapDiscovery).toHaveBeenCalledWith('pending');
    // #560: moderation actions are gone, but an admin viewing a filtered
    // status list must still see the read-only badge — showReviewStatus is
    // now the single derivation covering both old paths.
    expect(mockDiscoveryGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        showReviewStatus: true,
        items: [expect.objectContaining({ review_status: 'pending' })],
      }),
    );
  });

  it('does not pass any approve/reject wiring to the results grid (#560)', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true });
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('section=food&q=Munchies&status=pending'),
    );
    mockSearchPage('pending');

    render(<ProvidersContent />);

    // No path from the list to PATCH /api/admin/review-provider may survive:
    // the grid must not receive any of the removed moderation props.
    const gridProps = mockDiscoveryGrid.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(gridProps).not.toHaveProperty('enableModeration');
    expect(gridProps).not.toHaveProperty('onApprove');
    expect(gridProps).not.toHaveProperty('onReject');
    expect(gridProps).not.toHaveProperty('reviewingProviderId');
  });

  it('[post-fix PASSES] applies admin All status labels to the store section', () => {
    mockIsAdmin.mockReturnValue({ isAdmin: true });
    mockUseSearchParams.mockReturnValue(new URLSearchParams('section=store&q=Munchies'));
    mockSearchPage('rejected');

    render(<ProvidersContent />);

    expect(getSearchQueryOptions()?.queryKey[4]).toBe('all');
    expect(getSearchQueryOptions()?.queryKey[5]).toBe('store');
    expect(mockMapDiscovery).toHaveBeenCalledWith(null);
    expect(mockDiscoveryGrid).toHaveBeenCalledWith(
      expect.objectContaining({
        showReviewStatus: true,
        items: [expect.objectContaining({ review_status: 'rejected' })],
      }),
    );
  });
});
