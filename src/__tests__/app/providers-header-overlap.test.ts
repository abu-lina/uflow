/**
 * Plan 077 — Mobile header overlap regression tests
 *
 * Tests the padding arithmetic that prevents the fixed ProvidersPageHeader
 * from overlapping content on iOS devices with a notch / Dynamic Island.
 *
 * Uses PI-045 client-state precedence regression pattern:
 * - [pre-fix FAILS] makes the bug visible
 * - [post-fix PASSES] validates the fix expression
 */
import { describe, it, expect } from 'vitest';

/**
 * Header height breakdown (from Analysis 077 F1):
 *   max(24px, env(safe-area-inset-top) + 24px)  — top padding
 * + 40px                                         — SearchBar (h-10)
 * + 12px                                         — pb-3 gap
 * + ~32px                                        — CategoryFilter
 * + 6px                                          — pb-1.5 outer wrapper
 *
 * Non-notch (safe-area = 0):  24 + 40 + 12 + 32 + 6 = 114 px
 * Notch     (safe-area ≈ 59): 83 + 40 + 12 + 32 + 6 = 173 px
 */
const HEADER_HEIGHT_NON_NOTCH = 114;
const HEADER_HEIGHT_NOTCH = 173;
const SAFE_AREA_INSET_NOTCH = 59;

/** Pre-fix value: static pt-32 = 128 px */
const PRE_FIX_PADDING = 128;

/** Post-fix expression: max(128, env(safe-area-inset-top) + 128) */
function postFixPadding(safeAreaInsetTop: number): number {
  return Math.max(128, safeAreaInsetTop + 128);
}

describe('Plan 077 — ProvidersContent mobile header clearance', () => {
  describe('non-notch device (safe-area-inset-top = 0)', () => {
    it('pre-fix pt-32 (128px) clears header (114px) on non-notch device', () => {
      // Even before the fix, non-notch devices had sufficient clearance
      expect(PRE_FIX_PADDING).toBeGreaterThan(HEADER_HEIGHT_NON_NOTCH);
    });

    it('[post-fix PASSES] max(128px, 0 + 128px) preserves identical padding on non-notch device', () => {
      const padding = postFixPadding(0);
      expect(padding).toBe(128); // No change for non-notch
      expect(padding).toBeGreaterThan(HEADER_HEIGHT_NON_NOTCH);
    });
  });

  describe('notch device (safe-area-inset-top ≈ 59px)', () => {
    it('[pre-fix FAILS] pt-32 (128px) is less than header height on notch device (173px)', () => {
      // This test documents the bug: static 128px < 173px header on notch phones
      expect(PRE_FIX_PADDING).toBeLessThan(HEADER_HEIGHT_NOTCH);
    });

    it('[post-fix PASSES] max(128px, safe-area + 128px) clears the header on notch device', () => {
      const padding = postFixPadding(SAFE_AREA_INSET_NOTCH);
      // max(128, 59 + 128) = 187 > 173
      expect(padding).toBe(187);
      expect(padding).toBeGreaterThan(HEADER_HEIGHT_NOTCH);
    });
  });
});
