// @vitest-environment jsdom
/**
 * Plan 232 - Mobile filter blank page regression test
 *
 * When search results are empty (e.g. filter returns 0 results), the content
 * must still render through DiscoveryResultsGrid so that mobile padding
 * (paddingTop: headerOffset) is applied. A bare <EmptyState> renders behind
 * the fixed header on mobile, producing a blank page.
 *
 * Same applies to the loading and error states.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/food/stuttgart',
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('filters=spenden'),
}));

// --- Mock tanstack/react-query: default = empty results, no loading ---
let mockInfiniteQueryReturn: {
  data: { pages: { results: unknown[]; hasMore: boolean }[] };
  error: Error | null;
  fetchNextPage: ReturnType<typeof vi.fn>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  refetch: ReturnType<typeof vi.fn>;
} = {
  data: { pages: [{ results: [], hasMore: false }] },
  error: null,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: false,
  refetch: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => mockInfiniteQueryReturn,
  useQuery: () => ({ data: [] }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

// --- Track props passed to DiscoveryResultsGrid ---
const mockDiscoveryResultsGrid = vi.fn((_props: Record<string, unknown>) => (
  <div data-testid="discovery-results-grid" />
));

vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: (props: Record<string, unknown>) => mockDiscoveryResultsGrid(props),
}));

vi.mock('@/features/search/components/DiscoveryHeader', () => ({
  DiscoveryHeader: ({
    searchSlot,
    filterBarSlot,
  }: {
    searchSlot?: React.ReactNode;
    filterBarSlot?: React.ReactNode;
  }) => (
    <header className="fixed left-0 right-0 top-0 z-50" data-testid="discovery-header">
      {searchSlot}
      {filterBarSlot}
    </header>
  ),
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => <div data-testid="section-selector" />,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => <div data-testid="search-map" />,
}));

vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => <div data-testid="discovery-filter-bar" />,
}));

vi.mock('@/features/search/components/SearchContextBar', () => ({
  SearchContextBar: () => <div data-testid="search-context-bar" />,
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

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="bare-empty-state" data-title={title} data-description={description} />
  ),
}));

vi.mock('@/components/ui/SkeletonGrid', () => ({
  SkeletonGrid: () => <div data-testid="bare-skeleton-grid" />,
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
  AdminStatusFilter: () => <div />,
}));

vi.mock('@/features/admin/components/RejectModal', () => ({
  RejectModal: () => null,
}));

vi.mock('@/components/shared/LegalLinksModal', () => ({
  LegalLinksModal: () => null,
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
  LOCATION_ALL: 'all',
}));

const chainable = (): Record<string, unknown> => {
  const self: Record<string, unknown> = { data: [], error: null };
  self.select = () => self;
  self.eq = () => self;
  self.not = () => self;
  return self;
};
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => chainable(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('Plan 232 - Mobile filter blank page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default: empty results, not loading, no error
    mockInfiniteQueryReturn = {
      data: { pages: [{ results: [], hasMore: false }] },
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  });

  it('renders empty results through DiscoveryResultsGrid, not a bare EmptyState', () => {
    render(<ProvidersContent />);

    // DiscoveryResultsGrid should be rendered (it handles its own empty state with proper padding)
    expect(screen.getByTestId('discovery-results-grid')).toBeInTheDocument();

    // A bare EmptyState should NOT appear directly in ProvidersContent
    expect(screen.queryByTestId('bare-empty-state')).not.toBeInTheDocument();
  });

  it('passes correct empty-state messages to DiscoveryResultsGrid for 0 results', () => {
    render(<ProvidersContent />);

    // DiscoveryResultsGrid should receive emptyTitle and emptyDescription
    // so that the user-facing text matches the original ProvidersContent messages
    expect(mockDiscoveryResultsGrid).toHaveBeenCalled();
    const calls = mockDiscoveryResultsGrid.mock.calls;
    const lastCallArgs = calls[calls.length - 1] as unknown as [Record<string, unknown>];
    const lastProps = lastCallArgs[0];

    expect(lastProps.emptyTitle).toBe('providers.noResultsFound');
    expect(lastProps.emptyDescription).toBe('providers.noResultsDescription');
  });

  it('renders loading state through DiscoveryResultsGrid, not a bare SkeletonGrid', () => {
    mockInfiniteQueryReturn = {
      ...mockInfiniteQueryReturn,
      data: { pages: [] },
      isLoading: true,
    };

    render(<ProvidersContent />);

    // DiscoveryResultsGrid should be rendered (it handles its own loading state with proper padding)
    expect(screen.getByTestId('discovery-results-grid')).toBeInTheDocument();

    // A bare SkeletonGrid should NOT appear directly in ProvidersContent
    expect(screen.queryByTestId('bare-skeleton-grid')).not.toBeInTheDocument();
  });

  it('renders error state through DiscoveryResultsGrid, not a bare EmptyState', () => {
    mockInfiniteQueryReturn = {
      ...mockInfiniteQueryReturn,
      error: new Error('Network error'),
    };

    render(<ProvidersContent />);

    // DiscoveryResultsGrid should be rendered
    expect(screen.getByTestId('discovery-results-grid')).toBeInTheDocument();

    // A bare EmptyState should NOT appear directly in ProvidersContent
    expect(screen.queryByTestId('bare-empty-state')).not.toBeInTheDocument();
  });
});
