// @vitest-environment jsdom
/**
 * #936: Near Me toggle-off shows 'No providers found' instead of restoring results.
 *
 * When the desktop header navigates away from ?near_me=1, ProvidersContent must
 * detect that nearMeFromUrl became false, reset its own nearMeActive state, and
 * re-enable the main search query so results appear again.
 */

import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

// ── Controllable mocks ──────────────────────────────────────────────────

const { navMock, geoMock, nearMeMock, queryMock } = vi.hoisted(() => ({
  navMock: {
    searchParams: new URLSearchParams(),
    pathname: '/food',
  },
  geoMock: {
    status: 'idle' as string,
    coords: null as { latitude: number; longitude: number } | null,
    requestLocation: vi.fn(),
    reset: vi.fn(),
  },
  nearMeMock: {
    isActive: false,
    results: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
  queryMock: {
    enabled: true,
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

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (opts: { enabled?: boolean }) => {
    queryMock.enabled = opts.enabled ?? true;
    return {
      data: queryMock.enabled
        ? { pages: [{ results: [{ id: '1', provider_name: 'Test Provider' }], hasMore: false }] }
        : { pages: [{ results: [], hasMore: false }] },
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => geoMock,
}));

vi.mock('@/features/search/hooks/useNearMe', () => ({
  useNearMe: (opts: { active: boolean; coords: unknown }) => {
    const isActive = opts.active && opts.coords !== null;
    nearMeMock.isActive = isActive;
    return nearMeMock;
  },
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: ({
    searchSlot,
    filterBarSlot,
  }: {
    searchSlot?: React.ReactNode;
    filterBarSlot?: React.ReactNode;
  }) => (
    <header data-testid="discovery-header">
      {searchSlot}
      {filterBarSlot}
    </header>
  ),
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: () => <div data-testid="discovery-results-grid" />,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => <div data-testid="search-map" />,
}));

vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => <div data-testid="discovery-filter-bar" />,
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock('@/components/ui/SkeletonGrid', () => ({
  SkeletonGrid: () => <div data-testid="skeleton-grid" />,
}));

vi.mock('@/components/shared/MobileGreetingHeader', () => ({
  MobileGreetingHeader: () => <div />,
}));

vi.mock('@/components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div />,
}));

vi.mock('@/components/ui/Icon', () => ({
  Icon: () => <div />,
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
        'search.ariaLabel': 'Search',
        'search.context.allResults': 'All results',
        'search.context.edit': 'Edit',
        'suchen.clearAll': 'Clear',
        'suchen.nearMe.chipLabel': 'Near Me',
        'suchen.nearMe.ariaLabel': 'Toggle near me',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/features/admin/components/AdminStatusFilter', () => ({
  AdminStatusFilter: () => null,
}));

vi.mock('@/components/shared/LegalLinksModal', () => ({
  LegalLinksModal: () => null,
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

const chainable = (): Record<string, unknown> => {
  const self: Record<string, unknown> = { data: [], error: null };
  self.select = () => self;
  self.eq = () => self;
  self.not = () => self;
  return self;
};
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: () => chainable() },
}));

// ── Helpers ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  navMock.searchParams = new URLSearchParams();
  navMock.pathname = '/food';
  geoMock.status = 'idle';
  geoMock.coords = null;
  nearMeMock.isActive = false;
  queryMock.enabled = true;
});

/**
 * Simulate the desktop header "Everywhere" action: the URL loses near_me=1,
 * but ProvidersContent's geolocation instance still has granted+coords because
 * SearchBar only resets its own instance.
 */
function simulateDesktopHeaderEverywhere(rerender: (ui: React.ReactElement) => void) {
  navMock.searchParams = new URLSearchParams();
  navMock.pathname = '/food';
  // ProvidersContent's own geolocation stays granted — SearchBar resets its own.
  rerender(<ProvidersContent />);
}

// ── Tests (all three must FAIL before fix, PASS after) ──────────────────

describe('#936: Near Me toggle-off restores results', () => {
  it('AC1: selecting Near Me then Everywhere from desktop header re-enables the search query', () => {
    // 1. Mount with near_me=1 and geolocation already granted
    navMock.searchParams = new URLSearchParams('near_me=1');
    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };

    const { rerender } = render(<ProvidersContent />);

    // nearMe should be active, query disabled
    expect(nearMeMock.isActive).toBe(true);
    expect(queryMock.enabled).toBe(false);

    // 2. Desktop header navigates to /food (removes near_me=1)
    simulateDesktopHeaderEverywhere(rerender);

    // 3. nearMe must deactivate and query must re-enable
    expect(nearMeMock.isActive).toBe(false);
    expect(queryMock.enabled).toBe(true);
  });

  it('AC2: opening /food?near_me=1 then selecting Everywhere from desktop header shows results', () => {
    // Direct URL load with near_me=1
    navMock.searchParams = new URLSearchParams('near_me=1');
    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };

    const { rerender } = render(<ProvidersContent />);
    expect(nearMeMock.isActive).toBe(true);

    // Desktop header removes near_me from URL
    simulateDesktopHeaderEverywhere(rerender);

    // Must re-enable the query (no "No providers found")
    expect(nearMeMock.isActive).toBe(false);
    expect(queryMock.enabled).toBe(true);
  });

  it('AC2 also resets ProvidersContent geolocation so stale coords do not re-activate nearMe', () => {
    navMock.searchParams = new URLSearchParams('near_me=1');
    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };

    const { rerender } = render(<ProvidersContent />);
    expect(nearMeMock.isActive).toBe(true);

    // Desktop header removes near_me
    simulateDesktopHeaderEverywhere(rerender);

    // The effect should call geolocation.reset() so coords are null
    expect(geoMock.reset).toHaveBeenCalled();
  });

  it('AC3 (pin): turning Near Me off from the results-page filter still works', () => {
    // This is the existing mobile path — handleToggleNearMe calls
    // setNearMeActive(false) and geolocation.reset() directly.
    // We verify this path still works after the fix.
    navMock.searchParams = new URLSearchParams('near_me=1');
    geoMock.status = 'granted';
    geoMock.coords = { latitude: 48.7, longitude: 9.1 };

    const { rerender } = render(<ProvidersContent />);
    expect(nearMeMock.isActive).toBe(true);

    // Simulate mobile toggle: handleToggleNearMe would set nearMeActive=false,
    // call geolocation.reset(), and navigate. We test the URL-based path:
    // after handleToggleNearMe navigates, near_me disappears from URL.
    geoMock.status = 'idle';
    geoMock.coords = null;
    navMock.searchParams = new URLSearchParams();
    rerender(<ProvidersContent />);

    expect(nearMeMock.isActive).toBe(false);
    expect(queryMock.enabled).toBe(true);
  });
});
