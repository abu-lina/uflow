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

vi.mock('@/components/providers/ProvidersPageHeader', () => ({
  ProvidersPageHeader: () => (
    <header
      className="fixed left-0 right-0 top-0 z-50"
      data-testid="providers-search-header"
    />
  ),
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => (
    <div aria-label="browse sections" data-testid="providers-section-selector" role="tablist" />
  ),
}));

vi.mock('@/components/providers/SearchResultsList', () => ({
  SearchResultsList: () => <div data-testid="search-results-list" />,
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

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

describe('ProvidersContent layout regression (Plan 109)', () => {
  it('keeps providers search header fixed while section tabs are rendered in main content', () => {
    render(<ProvidersContent />);

    const fixedSearchHeader = screen.getByTestId('providers-search-header');
    expect(fixedSearchHeader).toHaveClass('fixed', 'left-0', 'right-0', 'top-0', 'z-50');

    const sectionTablist = screen.getByRole('tablist', { name: /browse sections/i });
    expect(sectionTablist).toBeInTheDocument();
    expect(fixedSearchHeader).not.toContainElement(sectionTablist);

    const main = screen.getByRole('main');
    expect(within(main).getByRole('tablist', { name: /browse sections/i })).toBeInTheDocument();
  });
});
