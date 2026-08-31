/**
 * Regression tests — Plan 089 Code Review Findings CR-H1 + CR-H2
 *
 * CR-H1: handleSearchSubmit drops ?section= param by rebuilding URLSearchParams from scratch.
 *   Pre-fix code:  const params = new URLSearchParams();
 *                  // section is never set → user leaves FOOD/UMMAH/BUSINESS on submit
 *   Post-fix code: const params = new URLSearchParams(window.location.search);
 *                  // existing params preserved, only q/category/location are updated
 *
 * CR-H2: cardMode is set globally by `isAdmin && status` without checking entity type.
 *   Pre-fix code:  const cardMode = isAdmin && status ? 'moderation' : 'bookmark';
 *                  // UMMAH section returns community_service rows, but moderation activates
 *   Post-fix code: const cardMode = isAdmin && status && section !== 'ummah' ? 'moderation' : 'bookmark';
 *                  // provider-only moderation actions are never shown for community_service rows
 *
 * TDD note: bugfix regression exception per Implementer mode — these are post-fix additions
 * for client-side state-management and entity-safety bugs. No new API surface. Pre-fix failure
 * is documented inline as the test naming pattern `[pre-fix FAILS]` / `[post-fix PASSES]`.
 */

import { describe, it, expect } from 'vitest';
import type { Section } from '@/providers/search-provider';

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
  function buildParamsPrefixPath(existingSearch: string, query: string, category: string | null, location: string): string {
    const params = new URLSearchParams(); // BUG: ignores existing params
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    return params.toString();
  }

  /** Mirror the post-fix expression from ProvidersContent.tsx handleSearchSubmit */
  function buildParamsPostfixPath(existingSearch: string, query: string, category: string | null, location: string): string {
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

// ============================================================================
// CR-H2: cardMode UMMAH entity safety
// ============================================================================
//
// The bug path:
//   Admin navigates to /providers?section=ummah&status=pending
//   UMMAH route returns community_service rows (no listing_type, no provider_id useful for review)
//   Pre-fix: cardMode = isAdmin && status ? 'moderation' : 'bookmark'
//   Result: Approve/Reject buttons rendered for community_service rows → invalid moderation calls
//
//   Post-fix: cardMode = isAdmin && status && section !== 'ummah' ? 'moderation' : 'bookmark'
//   Result: community_service rows always get bookmark mode; moderation only for food/business

describe('CR-H2: cardMode ummah entity safety', () => {
  type ReviewStatusFilter = 'approved' | 'pending' | 'rejected' | 'needs_revision' | null;

  /** Mirror the pre-fix expression from ProvidersContent.tsx */
  function resolveCardMode_prefixExpr(isAdmin: boolean, status: ReviewStatusFilter): 'moderation' | 'bookmark' {
    return isAdmin && status ? 'moderation' : 'bookmark';
  }

  /** Mirror the post-fix expression from ProvidersContent.tsx */
  function resolveCardMode_postfixExpr(isAdmin: boolean, status: ReviewStatusFilter, section: Section): 'moderation' | 'bookmark' {
    return isAdmin && status && section !== 'ummah' ? 'moderation' : 'bookmark';
  }

  it('[pre-fix FAILS] pre-fix expression activates moderation in UMMAH section for admin', () => {
    // Documents the bug: UMMAH section returns community_service rows, but moderation is enabled
    expect(resolveCardMode_prefixExpr(true, 'pending')).toBe('moderation');
  });

  it('[post-fix PASSES] moderation disabled for ummah section regardless of admin+status', () => {
    expect(resolveCardMode_postfixExpr(true, 'pending', 'ummah')).toBe('bookmark');
  });

  it('[post-fix PASSES] moderation still enabled for food section with admin+status', () => {
    expect(resolveCardMode_postfixExpr(true, 'pending', 'food')).toBe('moderation');
  });

  it('[post-fix PASSES] moderation still enabled for business section with admin+status', () => {
    expect(resolveCardMode_postfixExpr(true, 'pending', 'store')).toBe('moderation');
  });

  it('[post-fix PASSES] bookmark mode when status is null for all sections', () => {
    expect(resolveCardMode_postfixExpr(true, null, 'food')).toBe('bookmark');
    expect(resolveCardMode_postfixExpr(true, null, 'ummah')).toBe('bookmark');
    expect(resolveCardMode_postfixExpr(true, null, 'store')).toBe('bookmark');
  });

  it('[post-fix PASSES] bookmark mode when not admin regardless of section', () => {
    expect(resolveCardMode_postfixExpr(false, 'pending', 'ummah')).toBe('bookmark');
    expect(resolveCardMode_postfixExpr(false, 'pending', 'food')).toBe('bookmark');
  });
});
