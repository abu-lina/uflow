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
    get selectedLocation() { return mockSelectedLocationRef.current; },
    setSelectedLocation: vi.fn(),
    selectedSection: 'food',
    setSelectedSection: vi.fn(),
  }),
  LOCATION_ALL: '',
}));

vi.mock('@/components/providers/ProvidersPageHeader', () => ({
  ProvidersPageHeader: () => null,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/components/providers/SearchResultsList', () => ({
  SearchResultsList: () => null,
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

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
      }),
    }),
  },
}));

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
});

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
});
