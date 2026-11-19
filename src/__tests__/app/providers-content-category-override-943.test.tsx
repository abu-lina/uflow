// @vitest-environment jsdom
/**
 * #943 seam 2: ProvidersContent passes pageCategory as an override to
 * readDiscoveryQueryInBrowser so the browser's category matches the path.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockReadDQ = vi.fn().mockReturnValue({
  q: '',
  category: null,
  location: '',
  section: 'food',
  filters: undefined,
  nearMe: false,
  openNow: false,
  status: null,
  view: null,
  tier: undefined,
});

vi.mock('@/features/search/discoveryQuery', async (importOriginal) => {
  const orig = (await importOriginal()) as Record<string, unknown>;
  return {
    ...orig,
    readDiscoveryQueryInBrowser: (...args: unknown[]) => mockReadDQ(...args),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/food/berlin/kebab-doener',
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
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
  DiscoveryHeader: () => null,
}));

vi.mock('@/features/search/components/SectionSelector', () => ({
  SectionSelector: () => null,
}));

vi.mock('@/features/search/components/DiscoveryResultsGrid', () => ({
  DiscoveryResultsGrid: () => null,
}));

vi.mock('@/features/search/components/SearchMap', () => ({
  SearchMap: () => null,
}));

vi.mock('@/features/search/components/DiscoveryFilterBar', () => ({
  DiscoveryFilterBar: () => null,
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
    t: (key: string) => key,
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

import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

const CATEGORY_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';

describe('#943 seam 2: ProvidersContent uses pageCategory override', () => {
  it('AC1: passes pageCategory as category override to readDiscoveryQueryInBrowser', () => {
    render(<ProvidersContent pageCategory={CATEGORY_ID} />);

    expect(mockReadDQ).toHaveBeenCalled();
    const args = mockReadDQ.mock.calls[0];
    expect(args[2]).toEqual(expect.objectContaining({ category: CATEGORY_ID }));
  });

  it('AC5 (pin): no pageCategory → readDiscoveryQueryInBrowser called without category override', () => {
    mockReadDQ.mockClear();
    render(<ProvidersContent />);

    expect(mockReadDQ).toHaveBeenCalled();
    const args = mockReadDQ.mock.calls[0];
    const overrides = args[2];
    expect(overrides?.category).toBeUndefined();
  });
});
