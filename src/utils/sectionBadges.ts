/**
 * Plan 089 M5: Computed badge logic for section-specific badges.
 *
 * These are pure utility functions — no DB access, no side effects.
 * They derive display-layer computed badges from provider columns set by M1/M4.
 */

interface HalalStarsInput {
  verification_method?: 'online' | 'onsite' | null;
  has_certificate?: boolean;
}

interface BarakahBadgeInput {
  muslim_owned?: boolean;
  makes_donations?: boolean;
  economic_solidarity?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
}

/**
 * Returns the verification star level (0–4) for a FOOD provider.
 * Returns 0 when `verification_method` is null or undefined (no stars shown).
 *
 * Only display halal stars for `listing_type = 'food'` providers.
 */
export function computeHalalStars(provider: HalalStarsInput): 0 | 1 | 2 | 3 | 4 {
  if (provider.verification_method == null) {
    return 0;
  }

  const hasCertificate = Boolean(provider.has_certificate);

  if (provider.verification_method === 'online') {
    return hasCertificate ? 2 : 1;
  }

  return hasCertificate ? 4 : 3;
}

/**
 * Returns true when a provider qualifies for the Barakah badge.
 *
 * Criteria (Plan 089 M5):
 *   - `muslim_owned = true`, AND
 *   - At least 2 of: `makes_donations`, `economic_solidarity`,
 *     `has_prayer_space`, `family_friendly`, `women_friendly`
 *
 * Applicable to FOOD and BUSINESS sections only.
 */
export function computeBarakahBadge(provider: BarakahBadgeInput): boolean {
  if (!provider.muslim_owned) return false;

  const communityAttributes = [
    provider.makes_donations,
    provider.economic_solidarity,
    provider.has_prayer_space,
    provider.family_friendly,
    provider.women_friendly,
  ];

  const trueCount = communityAttributes.filter(Boolean).length;
  return trueCount >= 2;
}
