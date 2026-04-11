/**
 * Plan 089 M5: Computed badge logic for section-specific badges.
 *
 * These are pure utility functions — no DB access, no side effects.
 * They derive display-layer computed badges from provider columns set by M1/M4.
 */

interface HalalStarsInput {
  halal_level?: number | null;
}

interface BarakahBadgeInput {
  muslim_owned?: boolean;
  accepts_donations?: boolean;
  solidarity_pricing?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
}

/**
 * Returns the halal star level (0–3) for a FOOD provider.
 * Returns 0 when `halal_level` is null or undefined (no stars shown).
 *
 * Only display halal stars for `listing_type = 'food'` providers.
 */
export function computeHalalStars(provider: HalalStarsInput): 0 | 1 | 2 | 3 {
  const level = provider.halal_level ?? 0;
  if (level <= 0) return 0;
  if (level >= 3) return 3;
  return level as 1 | 2;
}

/**
 * Returns true when a provider qualifies for the Barakah badge.
 *
 * Criteria (Plan 089 M5):
 *   - `muslim_owned = true`, AND
 *   - At least 2 of: `accepts_donations`, `solidarity_pricing`,
 *     `has_prayer_space`, `family_friendly`, `women_friendly`
 *
 * Applicable to FOOD and BUSINESS sections only.
 */
export function computeBarakahBadge(provider: BarakahBadgeInput): boolean {
  if (!provider.muslim_owned) return false;

  const communityAttributes = [
    provider.accepts_donations,
    provider.solidarity_pricing,
    provider.has_prayer_space,
    provider.family_friendly,
    provider.women_friendly,
  ];

  const trueCount = communityAttributes.filter(Boolean).length;
  return trueCount >= 2;
}
