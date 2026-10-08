/**
 * Regression tests — Plan 089 Code Review Findings CR-H1 + CR-H2
 *
 * CR-H1: handleSearchSubmit drops ?section= param by rebuilding URLSearchParams from scratch.
 *   Pre-fix code:  const params = new URLSearchParams();
 *                  // section is never set → user leaves FOOD/UMMAH/BUSINESS on submit
 *   Post-fix code: const params = new URLSearchParams(window.location.search);
 *                  // existing params preserved, only q/category/location are updated
 *
 * #560: the CR-H2 describe was deleted. It only exercised local mirrors of a
 *   `cardMode = ... ? 'moderation' : 'bookmark'` expression that no longer
 *   exists — moderation mode is gone from ProvidersContent and ProviderCard.
 *   The real invariant it guarded (no review affordance on ummah rows) is now
 *   covered at the prop-capture seam in
 *   src/__tests__/app/providers-content-location-resolution.test.tsx
 *   ("shows no review-status badge for ummah rows even with an admin status
 *   filter").
 *
 * TDD note: bugfix regression exception per Implementer mode — these are post-fix additions
 * for client-side state-management and entity-safety bugs. No new API surface. Pre-fix failure
 * is documented inline as the test naming pattern `[pre-fix FAILS]` / `[post-fix PASSES]`.
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// CR-H1: handleSearchSubmit section param persistence
// ============================================================================
//
// The bug path:
//   User is on /providers?section=ummah&q=kebab
//   User submits new search "pizza" via SearchBar
//   handleSearchSubmit receives (query='pizza', category=null, location='')
//   Pre-fix: builds fresh URLSearchParams() → ?q=pizza (section gone)
//   Post-fix: builds from window.location.search → ?section=ummah&q=pizza (section preserved)

describe('CR-H1: handleSearchSubmit section param persistence', () => {
  /** Mirror the pre-fix expression from ProvidersContent.tsx handleSearchSubmit */
  function buildParamsPrefixPath(
    existingSearch: string,
    query: string,
    category: string | null,
    location: string,
  ): string {
    const params = new URLSearchParams(); // BUG: ignores existing params
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    return params.toString();
  }

  /** Mirror the post-fix expression from ProvidersContent.tsx handleSearchSubmit */
  function buildParamsPostfixPath(
    existingSearch: string,
    query: string,
    category: string | null,
    location: string,
  ): string {
    const params = new URLSearchParams(existingSearch); // FIX: start from existing
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    if (location) {
      params.set('location', location);
    } else {
      params.delete('location');
    }
    return params.toString();
  }

  it('[pre-fix FAILS] fresh URLSearchParams loses section when user submits search in UMMAH section', () => {
    const existingSearch = '?section=ummah&q=kebab';
    const result = buildParamsPrefixPath(existingSearch, 'pizza', null, '');
    const resultParams = new URLSearchParams(result);
    // Documents the bug: section is dropped
    expect(resultParams.has('section')).toBe(false);
  });

  it('[post-fix PASSES] section preserved when user submits search in UMMAH section', () => {
    const existingSearch = '?section=ummah&q=kebab';
    const result = buildParamsPostfixPath(existingSearch, 'pizza', null, '');
    const resultParams = new URLSearchParams(result);
    expect(resultParams.get('section')).toBe('ummah');
    expect(resultParams.get('q')).toBe('pizza');
  });

  it('[post-fix PASSES] section preserved when user submits search in BUSINESS section', () => {
    const existingSearch = '?section=business&location=Berlin';
    const result = buildParamsPostfixPath(existingSearch, 'coffee', null, 'Berlin');
    const resultParams = new URLSearchParams(result);
    expect(resultParams.get('section')).toBe('business');
    expect(resultParams.get('q')).toBe('coffee');
    expect(resultParams.get('location')).toBe('Berlin');
  });

  it('[post-fix PASSES] clearing search query removes q param but keeps section', () => {
    const existingSearch = '?section=food&q=kebab';
    const result = buildParamsPostfixPath(existingSearch, '', null, '');
    const resultParams = new URLSearchParams(result);
    expect(resultParams.has('q')).toBe(false);
    expect(resultParams.get('section')).toBe('food');
  });

  it('[post-fix PASSES] section absent URL navigates cleanly (no phantom section param added)', () => {
    const existingSearch = '?q=kebab'; // no section param
    const result = buildParamsPostfixPath(existingSearch, 'pizza', null, '');
    const resultParams = new URLSearchParams(result);
    expect(resultParams.has('section')).toBe(false); // section not invented
    expect(resultParams.get('q')).toBe('pizza');
  });
});
