/**
 * Plan 063 — Fresh-user mobile auth entry regression tests
 *
 * TDD: Tests written BEFORE implementation.
 *
 * Bug B root cause: shouldShowCityEarlyAccessNavbar() gates the `/` path
 * behind hasCompletedOnboarding(), which requires localStorage data that
 * fresh users (new device, incognito, cleared storage) do not have.
 * Result: mobileUiMode = 'none' → no Profile icon → no auth entry path.
 *
 * These tests exercise the exact pre-fix and post-fix expressions so the
 * bug is visible in test naming.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  shouldShowCityEarlyAccessNavbar,
  shouldShowMobileFooter,
} from '@/utils/navigationUtils';

/**
 * Helper: simulate a fresh user with NO localStorage/sessionStorage.
 * This is the default state after clearing storage in beforeEach.
 */

describe('Plan 063 — Fresh-user mobile auth entry (Bug B)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ---------- Core regression: fresh user on `/` ----------

  describe('[post-fix PASSES] Fresh user (no storage) on `/`', () => {
    it('shouldShowCityEarlyAccessNavbar returns true on `/` even without onboarding completion', () => {
      // Bug B: pre-fix this returned false because hasCompletedOnboarding() = false
      // Post-fix: `/` must always show CityEarlyAccessNavbar for non-Stage-3 users
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'onboarding')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar returns true on `/` for stage1 without storage', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar returns true on `/` for stage2 without storage', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage2')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar returns true on `/` during loading stage', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'loading')).toBe(true);
    });
  });

  // ---------- Stage 3 must remain unaffected ----------

  describe('Stage 3 remains unchanged for fresh users', () => {
    it('shouldShowCityEarlyAccessNavbar returns false for Stage 3 (isAppLaunched)', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, true, null, 'stage3')).toBe(false);
    });

    it('shouldShowCityEarlyAccessNavbar returns false for Stage 3 (provider count)', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage3')).toBe(false);
    });
  });

  // ---------- Other onboarding pages remain gated (Decision 4: deferred) ----------

  describe('Other onboarding pages remain gated for fresh users', () => {
    it('shouldShowCityEarlyAccessNavbar returns false on /about without onboarding', () => {
      expect(shouldShowCityEarlyAccessNavbar('/about', false, false, null, 'onboarding')).toBe(false);
    });

    it('shouldShowCityEarlyAccessNavbar returns false on /welcome without onboarding', () => {
      expect(shouldShowCityEarlyAccessNavbar('/welcome', false, false, null, 'onboarding')).toBe(false);
    });

    it('[post-fix PASSES] should remain hidden on locale-prefixed /city-selection routes', () => {
      expect(shouldShowCityEarlyAccessNavbar('/de/city-selection', false, false, null, 'stage2')).toBe(false);
    });
  });

  // ---------- Splash screen hides navbar (regression fix) ----------

  describe('Splash screen visibility hides navbar', () => {
    it('shouldShowCityEarlyAccessNavbar returns false on `/` when splash is visible', () => {
      // Navbar must be hidden during onboarding splash screens
      expect(shouldShowCityEarlyAccessNavbar('/', true, false, null, 'onboarding')).toBe(false);
    });

    it('shouldShowCityEarlyAccessNavbar returns false on `/` for all stages when splash visible', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', true, false, null, 'stage1')).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar('/', true, false, null, 'stage2')).toBe(false);
      expect(shouldShowCityEarlyAccessNavbar('/', true, false, null, 'loading')).toBe(false);
    });
  });

  // ---------- shouldShowMobileFooter for fresh user ----------

  describe('shouldShowMobileFooter for fresh user on `/`', () => {
    it('returns false for unauthenticated fresh user (CityEarlyAccessNavbar shown instead)', () => {
      // This is expected: unauthenticated users in early-access use CityEarlyAccessNavbar
      expect(shouldShowMobileFooter('/', false, null, false, 'onboarding')).toBe(false);
    });
  });
});
