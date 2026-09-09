// @vitest-environment jsdom
/**
 * Plan 234 — Mobile filters action bar hidden behind MobileFooterBar — regression tests
 *
 * TDD: Tests written BEFORE implementation.
 *
 * Bug: MobileFooterBar (bottom navigation bar) is visible on the /search page
 * and overlaps the search page's own fixed bottom action bar (filters/sort).
 *
 * Fix: Add /search to footerExcludedPages (both Stage 3 and Stage 1/2 paths)
 * and to excludedPages in shouldShowCityEarlyAccessNavbar.
 *
 * Same pattern as Plan 179 (/chat fix).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { User } from '@supabase/supabase-js';

import { shouldShowMobileFooter, shouldShowCityEarlyAccessNavbar } from '@/utils/navigationUtils';

/**
 * Helper: set localStorage so hasCompletedOnboarding() returns true.
 */
function simulateOnboardingComplete() {
  localStorage.setItem('ummahflow_onboarding', JSON.stringify({ earlyAccessUnlocked: true }));
  localStorage.setItem('selectedCity', 'Berlin');
}

describe('Plan 234 — /search page hides mobile navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    simulateOnboardingComplete();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ---------- Stage 3: shouldShowMobileFooter ----------

  describe('shouldShowMobileFooter with pathname /search (Stage 3)', () => {
    it('returns false for Stage 3 (isAppLaunched=true)', () => {
      expect(shouldShowMobileFooter('/search', false, null, true, 'stage3')).toBe(false);
    });

    it('returns false for Stage 3 (stage=stage3)', () => {
      expect(shouldShowMobileFooter('/search', false, null, false, 'stage3')).toBe(false);
    });

    it('returns false regardless of splash visibility in Stage 3', () => {
      expect(shouldShowMobileFooter('/search', true, null, true, 'stage3')).toBe(false);
    });
  });

  // ---------- Stage 1/2: shouldShowMobileFooter ----------

  describe('shouldShowMobileFooter with pathname /search (Stage 1/2)', () => {
    it('returns false for Stage 1/2 authenticated user with onboarding complete', () => {
      const mockUser = { id: 'test-user' } as unknown as User;
      expect(shouldShowMobileFooter('/search', false, mockUser, false, 'stage1')).toBe(false);
    });

    it('returns false for Stage 1/2 authenticated user with splash visible', () => {
      const mockUser = { id: 'test-user' } as unknown as User;
      expect(shouldShowMobileFooter('/search', true, mockUser, false, 'stage2')).toBe(false);
    });
  });

  // ---------- shouldShowCityEarlyAccessNavbar ----------

  describe('shouldShowCityEarlyAccessNavbar with pathname /search', () => {
    it('returns false for Stage 1/2 with onboarding complete', () => {
      expect(shouldShowCityEarlyAccessNavbar('/search', false, false, null, 'stage1')).toBe(false);
    });

    it('returns false for Stage 2 with onboarding complete', () => {
      expect(shouldShowCityEarlyAccessNavbar('/search', false, false, null, 'stage2')).toBe(false);
    });

    it('returns false regardless of splash visibility', () => {
      expect(shouldShowCityEarlyAccessNavbar('/search', true, false, null, 'stage1')).toBe(false);
    });
  });

  // ---------- Non-/search pages remain unaffected ----------

  describe('Non-/search pages remain unaffected', () => {
    it('shouldShowMobileFooter still returns true for non-excluded Stage 3 paths', () => {
      expect(shouldShowMobileFooter('/', false, null, true, 'stage3')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar still returns true for non-excluded paths', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar still returns true for /providers', () => {
      expect(shouldShowCityEarlyAccessNavbar('/providers', false, false, null, 'stage2')).toBe(
        true,
      );
    });
  });
});
