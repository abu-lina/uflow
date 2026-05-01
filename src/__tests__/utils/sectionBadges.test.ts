/**
 * Plan 089 M5: Computed badge logic tests
 *
 * Tests for:
 *   - computeHalalStars(provider): returns halal_level (0 if absent)
 *   - computeBarakahBadge(provider): muslim_owned + ≥2 community attributes
 *
 * TDD Gate: written BEFORE implementation of src/utils/sectionBadges.ts
 */

import { describe, it, expect } from 'vitest';
import { computeHalalStars, computeBarakahBadge } from '@/utils/sectionBadges';

// ─── computeHalalStars ───────────────────────────────────────────────────────

describe('computeHalalStars (Plan 089 M5)', () => {
  it('returns 0 when halal_level is null', () => {
    expect(computeHalalStars({ halal_level: null })).toBe(0);
  });

  it('returns 0 when halal_level is undefined', () => {
    expect(computeHalalStars({})).toBe(0);
  });

  it('returns 1 for halal_level = 1', () => {
    expect(computeHalalStars({ halal_level: 1 })).toBe(1);
  });

  it('returns 2 for halal_level = 2', () => {
    expect(computeHalalStars({ halal_level: 2 })).toBe(2);
  });

  it('returns 3 for halal_level = 3', () => {
    expect(computeHalalStars({ halal_level: 3 })).toBe(3);
  });
});

// ─── computeBarakahBadge ─────────────────────────────────────────────────────

describe('computeBarakahBadge (Plan 089 M5)', () => {
  it('returns false when muslim_owned is false', () => {
    expect(
      computeBarakahBadge({
        muslim_owned: false,
        makes_donations: true,
        economic_solidarity: true,
      }),
    ).toBe(false);
  });

  it('returns false when muslim_owned is true but fewer than 2 community attributes', () => {
    expect(
      computeBarakahBadge({
        muslim_owned: true,
        makes_donations: true,
        economic_solidarity: false,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
      }),
    ).toBe(false);
  });

  it('returns true when muslim_owned is true and exactly 2 community attributes', () => {
    expect(
      computeBarakahBadge({
        muslim_owned: true,
        makes_donations: true,
        economic_solidarity: true,
        has_prayer_space: false,
        family_friendly: false,
        women_friendly: false,
      }),
    ).toBe(true);
  });

  it('returns true when muslim_owned is true and more than 2 community attributes', () => {
    expect(
      computeBarakahBadge({
        muslim_owned: true,
        makes_donations: true,
        economic_solidarity: true,
        has_prayer_space: true,
        family_friendly: false,
        women_friendly: false,
      }),
    ).toBe(true);
  });

  it('returns false when provider is empty object', () => {
    expect(computeBarakahBadge({})).toBe(false);
  });

  it('returns false when all attributes are undefined', () => {
    expect(computeBarakahBadge({ muslim_owned: true })).toBe(false);
  });
});
