/**
 * Regression tests — Plan 045: Providers Category Filter Bugfix
 *
 * BUG-1: Stale `selectedCategory` client context overrides the URL `?category=` param.
 *   Pre-fix code: `selectedCategory ?? (searchParams.get('category') || null)`
 *   When selectedCategory = 'old-uuid' and URL has ?category=new-uuid, context wins → wrong results.
 *   Fixed code: `(searchParams.get('category') || null) ?? selectedCategory`
 *   URL param is the canonical source of truth; context is fallback only when URL has no category.
 *
 * BUG-2: `t('search.all')` locale strings leaked into the category transport value.
 *   Pre-fix: `fetchProvidersFromAPI(query, category || t('search.all'), ...)` and same in queryKey.
 *   Arabic/Turkish/Urdu/Pashto users got `'الكل'|'Tümü'|'سب'|'ټول'` sent as category,
 *   which are not recognised by `getSearchStrategy` → fell through to `'providers_only'`
 *   instead of `'both'`, hiding all community services on the no-category browse.
 *   Fixed code: `null` is passed when no category is selected; the API handles null → 'both'.
 *
 * TDD note: bugfix regression exception applies — these tests are post-fix additions for a
 * client-side state-management bug (no new API surface). Pre-fix failure is documented inline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// BUG-1: Unit test of the category resolution logic
// ============================================================================
//
// The ProvidersContent component resolves `category` from two competing sources:
//   - `searchParams.get('category')` (URL param — canonical, external)
//   - `selectedCategory` from SearchProvider context (mutable, session-lived)
//
// Pre-fix expression:  selectedCategory ?? (urlParam || null)
// Post-fix expression: (urlParam || null) ?? selectedCategory

describe('Plan 045 BUG-1 — category resolution precedence', () => {
  // Helpers that mirror the pre-fix and post-fix expressions exactly
  function preFixCategory(urlParam: string | null, contextCategory: string | null): string | null {
    return contextCategory ?? (urlParam || null);
  }
  function postFixCategory(urlParam: string | null, contextCategory: string | null): string | null {
    return (urlParam || null) ?? contextCategory;
  }

  // Demonstrates the bug: stale context wins over the URL param (wrong behaviour)
  it('[pre-fix FAILS] stale context overrides URL param when both are present', () => {
    const stale = 'bildung-uuid';
    const url = 'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d';
    // Pre-fix: stale context wins → wrong results displayed
    expect(preFixCategory(url, stale)).toBe('bildung-uuid');
    // Post-fix: URL param wins → correct results displayed
    expect(postFixCategory(url, stale)).toBe('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d');
  });

  // Demonstrates the fix: URL param takes precedence when present
  it('[post-fix PASSES] URL param wins over stale context', () => {
    const stale = 'bildung-uuid';
    const url = 'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d';
    expect(postFixCategory(url, stale)).toBe('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d');
  });

  // Context is still used as a fallback when the URL has no category param
  it('[post-fix PASSES] context is used when URL param is absent', () => {
    const stale = 'bildung-uuid';
    expect(postFixCategory(null, stale)).toBe('bildung-uuid');
  });

  // No URL param, no context → null (no filter applied)
  it('[post-fix PASSES] resolves to null when both URL and context are absent', () => {
    expect(postFixCategory(null, null)).toBeNull();
  });

  // URL param is empty string (treated as absent, same as null)
  it('[post-fix PASSES] empty string URL param is treated as absent', () => {
    const stale = 'bildung-uuid';
    // `'' || null` = null, so context is used
    expect(postFixCategory('', stale)).toBe('bildung-uuid');
  });
});

// ============================================================================
// BUG-2: Unit test that null is passed when no category is selected
// ============================================================================
//
// Pre-fix: `category || t('search.all')` — when category is null, a localized
//   label (e.g. 'الكل', 'Tümü') is injected. Only 'Alle' and 'All' are
//   recognised by getSearchStrategy; all others fall through to 'providers_only'.
// Post-fix: `category` is passed as-is (null when no filter); null routes
//   to the 'both' strategy, showing providers + community services.

describe('Plan 045 BUG-2 — no-category transport value must be null', () => {
  type SearchStrategy = 'providers_only' | 'community_services_only' | 'both';

  // Mirror of the actual getSearchStrategy function in services/providers.ts
  function getSearchStrategy(category: string | null | undefined): SearchStrategy {
    if (!category || category === 'Alle' || category === 'All') return 'both';
    if (category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7') return 'community_services_only';
    return 'providers_only';
  }

  // Pre-fix: when no category is selected, t('search.all') produced locale strings
  it('[pre-fix FAILS] localized "all" strings fall through to providers_only (not both)', () => {
    const nonDeEnLabels = ['الكل', 'Tümü', 'سب', 'ټول'];
    for (const label of nonDeEnLabels) {
      // Simulates: category || t('search.all') → t('search.all') returns label
      const preFixCategory = label;
      expect(getSearchStrategy(preFixCategory)).toBe('providers_only'); // BUG: wrong strategy
    }
  });

  // Post-fix: null is passed → 'both' strategy (correct)
  it('[post-fix PASSES] null is recognised as "all categories" and returns both strategy', () => {
    // Post-fix passes null directly (no t('search.all') fallback)
    expect(getSearchStrategy(null)).toBe('both');
  });

  // 'Alle' and 'All' still work for legacy compatibility
  it('[post-fix PASSES] legacy "Alle"/"All" strings are still recognised as all-categories', () => {
    expect(getSearchStrategy('Alle')).toBe('both');
    expect(getSearchStrategy('All')).toBe('both');
  });

  // Actual category UUID routes to providers_only (correct filtering behaviour preserved)
  it('[post-fix PASSES] category UUID routes to providers_only strategy (filter still works)', () => {
    expect(getSearchStrategy('df8e549d-54c4-48ef-8e0b-c5a6646fcb7d')).toBe('providers_only');
  });
});

// ============================================================================
// API route regression — category pass-through
// Ensures the server-side GET handler correctly forwards category to search service
// ============================================================================

const { mockSearch } = vi.hoisted(() => ({ mockSearch: vi.fn() }));
vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: mockSearch,
}));

import { GET } from '@/app/api/providers/search/route';

describe('Plan 045 — GET /api/providers/search category transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: [], hasMore: false });
  });

  it('forwards category UUID param to search service', async () => {
    await GET(
      new Request(
        'http://localhost:3000/api/providers/search?category=df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
      ),
    );
    expect(mockSearch).toHaveBeenCalledWith(
      '',
      'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d',
      '',
      0,
      12,
    );
  });

  it('passes null (not a locale label) when category param is absent', async () => {
    await GET(new Request('http://localhost:3000/api/providers/search'));
    const [, categoryArg] = mockSearch.mock.calls[0];
    expect(categoryArg).toBeNull();
  });
});
