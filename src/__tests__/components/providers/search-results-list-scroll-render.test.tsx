/**
 * Plan 053 — M4: Provider scroll render bug regression tests
 *
 * TDD tests written BEFORE implementation (RED phase).
 *
 * Bug path: SearchResultsList switches from CSS grid to react-window
 * FixedSizeList when filteredResults.length > VIRTUALIZATION_THRESHOLD (50),
 * causing layout collapse, card overlap, and premature pagination.
 *
 * [pre-fix FAILS]: Grid layout lost after 50+ items — virtualization takes over
 * [post-fix PASSES]: Grid layout stays consistent regardless of item count
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// jsdom polyfills for browser APIs used by SearchResultsList
const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

const mockResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('ResizeObserver', mockResizeObserver);

// Mock dependencies that SearchResultsList uses
vi.mock('@/hooks/useProvider', () => ({
  usePrefetchProvider: () => vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'de' }),
}));

vi.mock('@/components/providers/ProviderCard', () => ({
  ProviderCard: vi.fn(({ provider_name }: { provider_name: string }) => (
    <div data-testid="provider-card">{provider_name}</div>
  )),
}));

vi.mock('@/components/ui/SkeletonCard', () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

import { SearchResultsList } from '@/components/providers/SearchResultsList';
import type { SearchResult } from '@/services/providers';

/**
 * Helper: generate N mock SearchResult items for testing threshold behavior
 */
function generateMockResults(count: number): SearchResult[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `provider-${i}`,
    name: `Provider ${i}`,
    images: null,
    category_id: 'cat-1',
    address_city: 'Berlin',
    social_website: null,
    social_instagram: null,
    contact_email: null,
    contact_phone: null,
    address_street: null,
    address_country: null,
    address_zip: null,
    location_latitude: null,
    location_longitude: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',

    offers_ids: [],
    needs_ids: [],
    category: { name_de: 'Test Category' },
    type: 'provider' as const,
  }));
}

const defaultProps = {
  bookmarkedProviderIds: [] as string[],
  onProviderClick: vi.fn(),
  onBookmarkChange: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  onLoadMore: vi.fn(),
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// REGRESSION: Layout mode must stay consistent regardless of item count
// ---------------------------------------------------------------------------
describe('SearchResultsList — layout rendering contract (Plan 053)', () => {
  it('[post-fix PASSES] renders grid layout with 12 items (below any threshold)', () => {
    const results = generateMockResults(12);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} />,
    );

    // The CSS grid container should be present
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
    // Should have responsive column classes (2-column on mobile for better UX)
    expect(gridContainer?.className).toContain('grid-cols-2');

    // All provider cards should render
    expect(screen.getAllByTestId('provider-card')).toHaveLength(12);
  });

  it('[pre-fix FAILS] [post-fix PASSES] renders SAME grid layout with 60 items (above old VIRTUALIZATION_THRESHOLD=50)', () => {
    const results = generateMockResults(60);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} />,
    );

    // BUG PATH: Pre-fix, the component switches to react-window FixedSizeList
    // at 50+ items, losing the CSS grid. Post-fix, the grid must persist.
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();
    expect(gridContainer?.className).toContain('grid-cols-2');

    // All 60 cards should render in the grid (no virtualization hiding items)
    expect(screen.getAllByTestId('provider-card')).toHaveLength(60);
  });

  it('[pre-fix FAILS] [post-fix PASSES] renders SAME grid layout with 100 items (well above old threshold)', () => {
    const results = generateMockResults(100);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} />,
    );

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();

    // All 100 cards should render — no virtualization path
    expect(screen.getAllByTestId('provider-card')).toHaveLength(100);
  });

  it('[pre-fix FAILS] [post-fix PASSES] does NOT render a react-window FixedSizeList at any item count', () => {
    const results = generateMockResults(60);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} />,
    );

    // The virtual list wrapper had h-[70vh] and min-h-[400px] classes.
    // After fix, this element should NOT exist.
    const virtualWrapper = container.querySelector('.h-\\[70vh\\]');
    expect(virtualWrapper).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// REGRESSION: Pagination sentinel must be in page flow (not inside virtual list)
// ---------------------------------------------------------------------------
describe('SearchResultsList — pagination trigger alignment (Plan 053 M3)', () => {
  it('renders the load-more sentinel when hasNextPage is true', () => {
    const results = generateMockResults(12);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} hasNextPage={true} />,
    );

    // The sentinel div with h-1 should exist for IntersectionObserver
    const sentinel = container.querySelector('[aria-hidden="true"]');
    expect(sentinel).toBeTruthy();
  });

  it('does NOT render a load-more sentinel when hasNextPage is false', () => {
    const results = generateMockResults(12);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} hasNextPage={false} />,
    );

    // No sentinel should exist
    const sentinel = container.querySelector('[aria-hidden="true"]');
    expect(sentinel).toBeNull();
  });

  it('[post-fix PASSES] pagination sentinel still works correctly with 60+ items', () => {
    const results = generateMockResults(60);
    const { container } = render(
      <SearchResultsList {...defaultProps} searchResults={results} hasNextPage={true} />,
    );

    // Grid should exist
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeTruthy();

    // Sentinel should exist in normal page flow (below the grid)
    const sentinel = container.querySelector('[aria-hidden="true"]');
    expect(sentinel).toBeTruthy();
  });

  it('shows skeleton cards when isFetchingNextPage is true', () => {
    const results = generateMockResults(12);
    render(
      <SearchResultsList
        {...defaultProps}
        searchResults={results}
        hasNextPage={true}
        isFetchingNextPage={true}
      />,
    );

    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Null safety and filtering
// ---------------------------------------------------------------------------
describe('SearchResultsList — data filtering', () => {
  it('filters out null results and results with null ids', () => {
    const results: SearchResult[] = [
      ...generateMockResults(3),
      null as unknown as SearchResult,
      { ...generateMockResults(1)[0], id: null as unknown as string },
    ];
    render(
      <SearchResultsList {...defaultProps} searchResults={results} />,
    );

    // Should only render the 3 valid results
    expect(screen.getAllByTestId('provider-card')).toHaveLength(3);
  });
});
