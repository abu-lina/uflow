import { render, screen, within } from '@testing-library/react';
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
  useSearchParams: () => new URLSearchParams('section=food&q=Indigo&location=Berlin'),
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
  DiscoveryHeader: ({ searchSlot, filterBarSlot }: { searchSlot?: React.ReactNode; filterBarSlot?: React.ReactNode }) => (
    <header
      className="fixed left-0 right-0 top-0 z-50"
      data-testid="discovery-header"
    >
      <div aria-label="browse sections" data-testid="providers-section-selector" role="tablist" />
      {searchSlot}
      {filterBarSlot}
    </header>
  ),
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => (
    <div aria-label="browse sections" data-testid="providers-section-selector" role="tablist" />
  ),
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

vi.mock('@/features/search/components/HomeSearchInput', () => ({
  HomeSearchInput: () => <div data-testid="home-search-input" />,
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
        'providers.adminFilterLabel': 'Admin Filter:',
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

describe('ProvidersContent layout regression (Plan 109)', () => {
  it('renders section tabs inside the fixed mobile header above the search bar', () => {
    render(<ProvidersContent />);

    const fixedSearchHeader = screen.getByTestId('discovery-header');
    expect(fixedSearchHeader).toHaveClass('fixed', 'left-0', 'right-0', 'top-0', 'z-50');

    const sectionTablist = screen.getByRole('tablist', { name: /browse sections/i });
    expect(sectionTablist).toBeInTheDocument();
    expect(fixedSearchHeader).toContainElement(sectionTablist);

    const main = screen.getByRole('main');
    expect(within(main).queryByRole('tablist', { name: /browse sections/i })).not.toBeInTheDocument();
  });
});
