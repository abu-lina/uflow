// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const { mockUseSearchParams, mockRouterPush } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(() => new URLSearchParams()),
  mockRouterPush: vi.fn(),
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

interface FilterBarProps {
  locationCity?: string | null;
  onLocationClick?: () => void;
  onToggleNearMe?: () => void;
  nearMeActive?: boolean;
}

const { filterBarPropsRef } = vi.hoisted(() => ({
  filterBarPropsRef: { current: null as unknown },
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: mockUseInfiniteQuery,
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/food/stuttgart',
  useRouter: () => ({ replace: vi.fn(), push: mockRouterPush, prefetch: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('@/providers/search-provider', () => ({
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
  LOCATION_ALL: '',
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: () => null,
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: ({ filterBarSlot }: { filterBarSlot?: { props?: FilterBarProps } }) => {
    filterBarPropsRef.current = filterBarSlot?.props ?? null;
    return null;
  },
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

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    coords: null,
    requestLocation: vi.fn(),
    reset: vi.fn(),
  }),
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
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/features/admin/hooks/useProviderReview', () => ({
  useProviderReview: () => ({
    approveProvider: vi.fn(),
    rejectProvider: vi.fn(),
    isLoading: false,
    reviewingProviderId: null,
  }),
}));

vi.mock('@/features/admin/components/AdminStatusFilter', () => ({
  AdminStatusFilter: () => null,
}));

vi.mock('@/features/admin/components/RejectModal', () => ({
  RejectModal: () => null,
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

function filterBarProps(): FilterBarProps {
  return filterBarPropsRef.current as FilterBarProps;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  filterBarPropsRef.current = null;
});

describe('ProvidersContent mobile location chip', () => {
  it('passes the path city to the filter bar', () => {
    render(<ProvidersContent defaultLocation="Stuttgart" />);
    expect(filterBarProps().locationCity).toBe('Stuttgart');
  });

  it('resolves the chip label from the legacy ?location= param', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('location=Berlin'));
    render(<ProvidersContent />);
    expect(filterBarProps().locationCity).toBe('Berlin');
  });

  it('resolves the chip label to no city when no location transport exists', () => {
    render(<ProvidersContent />);
    expect(filterBarProps().locationCity).toBeFalsy();
  });

  it('routes to /search with the Wo accordion open on chip tap', () => {
    render(<ProvidersContent defaultLocation="Stuttgart" />);
    act(() => {
      filterBarProps().onLocationClick?.();
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/search?section=food&open=wo');
  });
});

describe('ProvidersContent near-me exclusivity', () => {
  it('pushes the section root with near_me=1 when Near Me is activated', () => {
    render(<ProvidersContent defaultLocation="Stuttgart" />);
    act(() => {
      filterBarProps().onToggleNearMe?.();
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/food?near_me=1');
  });

  it('pushes the near_me-stripped URL when Near Me is deactivated', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('near_me=1'));
    render(<ProvidersContent />);
    act(() => {
      filterBarProps().onToggleNearMe?.();
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/food/stuttgart?');
  });

  it('lands Near Me off when the URL carries no near_me param (city pick clears it)', () => {
    render(<ProvidersContent defaultLocation="Stuttgart" />);
    expect(filterBarProps().nearMeActive).toBe(false);
  });
});
