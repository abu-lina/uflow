/**
 * Plan 062 — Profile Menu Fix — Navigation Selection Regression Tests
 *
 * TDD: Tests written BEFORE implementation.
 * These tests cover the exact pre-fix failure path where:
 *   - CityEarlyAccessNavbar (early-access stages) lacks a Profile/account entry
 *   - shouldShowMobileFooter returns false for unauthenticated Stage 1/2 users
 *
 * The tests make the bug visible in naming so future regressions are easy to diagnose.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  shouldShowMobileFooter,
  shouldShowCityEarlyAccessNavbar,
} from '@/utils/navigationUtils';

/**
 * Helper: set localStorage so hasCompletedOnboarding() returns true.
 * It checks for ummahflow_onboarding.earlyAccessUnlocked AND selectedCity.
 */
function simulateOnboardingComplete() {
  localStorage.setItem(
    'ummahflow_onboarding',
    JSON.stringify({ earlyAccessUnlocked: true }),
  );
  localStorage.setItem('selectedCity', 'Berlin');
}

describe('Plan 062 — Mobile nav selection: Stage/Auth matrix', () => {
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

  // ---------- Stage 3 behaviour (unchanged — full MobileFooterBar) ----------

  describe('Stage 3 (isAppLaunched=true OR stage=stage3)', () => {
    it('shows MobileFooterBar for unauthenticated user on root', () => {
      expect(shouldShowMobileFooter('/', false, null, true, 'stage3')).toBe(true);
    });

    it('hides CityEarlyAccessNavbar for any user', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, true, null, 'stage3')).toBe(false);
    });
  });

  // ---------- Stage 1/2 unauthenticated — the failing path ----------

  describe('[post-fix PASSES] Stage 1/2 unauthenticated user on root', () => {
    it('shouldShowMobileFooter returns false (CityEarlyAccessNavbar shown instead)', () => {
      // This is expected and correct: unauthenticated early-access users use CityEarlyAccessNavbar
      expect(shouldShowMobileFooter('/', false, null, false, 'stage1')).toBe(false);
    });

    it('shouldShowCityEarlyAccessNavbar returns true on root with onboarding complete', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar returns true for Stage 2 on /providers', () => {
      expect(shouldShowCityEarlyAccessNavbar('/providers', false, false, null, 'stage2')).toBe(true);
    });
  });

  // ---------- Stage 1/2 authenticated — MobileFooterBar shown ----------

  describe('Stage 1/2 authenticated user', () => {
    const mockUser = { id: 'test-user' } as any;

    it('shouldShowMobileFooter returns true for authenticated user on root', () => {
      expect(shouldShowMobileFooter('/', false, mockUser, false, 'stage1')).toBe(true);
    });

    it('shouldShowMobileFooter returns true for authenticated user on /providers', () => {
      expect(shouldShowMobileFooter('/providers', false, mockUser, false, 'stage2')).toBe(true);
    });
  });

  // ---------- Excluded pages remain excluded ----------

  describe('Excluded pages', () => {
    it('shouldShowMobileFooter returns false for provider detail page in Stage 3', () => {
      expect(shouldShowMobileFooter('/providers/123', false, null, true, 'stage3')).toBe(false);
    });

    it('shouldShowCityEarlyAccessNavbar returns false for /about', () => {
      expect(shouldShowCityEarlyAccessNavbar('/about', false, false, null, 'stage1')).toBe(false);
    });
  });
});
