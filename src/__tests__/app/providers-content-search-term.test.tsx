/**
 * Plan 222: Regression test — search term visible in providers page search bar.
 *
 * When navigating from the map view search (e.g. ?q=Lolo&section=food),
 * the search bar on the providers page must display the query so the user
 * can see what they searched for and clear it.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/providers',
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams('q=Lolo&section=food'),
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

// Mock DiscoveryHeader to render the searchSlot so we can inspect it
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
        'search.context.backToHome': 'Back to home',
        'suchen.clearAll': 'Clear',
      };
      return map[key] ?? key;
    },
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

describe('ProvidersContent search term display (Plan 222)', () => {
  it('displays the query from ?q= in the search bar input', () => {
    render(<ProvidersContent />);

    // The search bar input should show "Lolo" (from ?q=Lolo in the URL)
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveValue('Lolo');
  });

  it('renders a clear button when a search term is present', () => {
    render(<ProvidersContent />);

    // SearchContextBar renders an X button when draftQuery is non-empty
    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toBeInTheDocument();
  });
});
