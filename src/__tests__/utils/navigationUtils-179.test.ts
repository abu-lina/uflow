/**
 * Plan 179 — Mobile navbar overflowing chat input — regression tests
 *
 * TDD: Tests written BEFORE implementation.
 *
 * Bug: MobileFooterBar (bottom navigation bar) is visible on the /chat page
 * and overlaps the chat input and send button. Chat input has ~12px bottom
 * padding, while the footer is ~92-130px tall.
 *
 * Fix: Add /chat to footerExcludedPages (both Stage 3 and Stage 1/2 paths)
 * and to excludedPages in shouldShowCityEarlyAccessNavbar.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  shouldShowMobileFooter,
  shouldShowCityEarlyAccessNavbar,
} from '@/utils/navigationUtils';

/**
 * Helper: set localStorage so hasCompletedOnboarding() returns true.
 */
function simulateOnboardingComplete() {
  localStorage.setItem(
    'ummahflow_onboarding',
    JSON.stringify({ earlyAccessUnlocked: true }),
  );
  localStorage.setItem('selectedCity', 'Berlin');
}

describe('Plan 179 — /chat page hides mobile navbar', () => {
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

  describe('shouldShowMobileFooter with pathname /chat (Stage 3)', () => {
    it('returns false for Stage 3 (isAppLaunched=true)', () => {
      expect(shouldShowMobileFooter('/chat', false, null, true, 'stage3')).toBe(false);
    });

    it('returns false for Stage 3 (stage=stage3)', () => {
      expect(shouldShowMobileFooter('/chat', false, null, false, 'stage3')).toBe(false);
    });

    it('returns false regardless of splash visibility in Stage 3', () => {
      expect(shouldShowMobileFooter('/chat', true, null, true, 'stage3')).toBe(false);
    });
  });

  // ---------- Stage 1/2: shouldShowMobileFooter ----------

  describe('shouldShowMobileFooter with pathname /chat (Stage 1/2)', () => {
    it('returns false for Stage 1/2 authenticated user with onboarding complete', () => {
      const mockUser = { id: 'test-user' } as any;
      expect(shouldShowMobileFooter('/chat', false, mockUser, false, 'stage1')).toBe(false);
    });

    it('returns false for Stage 1/2 authenticated user with splash visible', () => {
      const mockUser = { id: 'test-user' } as any;
      expect(shouldShowMobileFooter('/chat', true, mockUser, false, 'stage2')).toBe(false);
    });
  });

  // ---------- shouldShowCityEarlyAccessNavbar ----------

  describe('shouldShowCityEarlyAccessNavbar with pathname /chat', () => {
    it('returns false for Stage 1/2 with onboarding complete', () => {
      expect(shouldShowCityEarlyAccessNavbar('/chat', false, false, null, 'stage1')).toBe(false);
    });

    it('returns false for Stage 2 with onboarding complete', () => {
      expect(shouldShowCityEarlyAccessNavbar('/chat', false, false, null, 'stage2')).toBe(false);
    });

    it('returns false regardless of splash visibility', () => {
      expect(shouldShowCityEarlyAccessNavbar('/chat', true, false, null, 'stage1')).toBe(false);
    });
  });

  // ---------- Non-/chat pages remain unaffected ----------

  describe('Non-/chat pages remain unaffected', () => {
    it('shouldShowMobileFooter still returns true for non-excluded Stage 3 paths', () => {
      expect(shouldShowMobileFooter('/', false, null, true, 'stage3')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar still returns true for non-excluded paths', () => {
      expect(shouldShowCityEarlyAccessNavbar('/', false, false, null, 'stage1')).toBe(true);
    });

    it('shouldShowCityEarlyAccessNavbar still returns true for /providers', () => {
      expect(shouldShowCityEarlyAccessNavbar('/providers', false, false, null, 'stage2')).toBe(true);
    });
  });
});
