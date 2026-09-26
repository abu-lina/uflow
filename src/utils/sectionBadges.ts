/**
 * Plan 089 M5: Computed badge logic for section-specific badges.
 *
 * These are pure utility functions — no DB access, no side effects.
 * They derive display-layer computed badges from provider columns set by M1/M4.
 */

interface HalalStarsInput {
  verification_method?: 'online' | 'onsite' | null;
  has_certificate?: boolean;
  no_alcohol?: boolean | null;
  no_pork?: boolean | null;
  no_gambling?: boolean | null;
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

  // Certificate alone is enough (gold-tier equivalent)
  if (hasCertificate) {
    if (provider.verification_method === 'online') return 2;
    return 4;
  }

  // When attestation data is available (explicitly true or false), require at
  // least one positive answer. A provider with verification_method set but all
  // attestation false hasn't passed the halal check.
  // NULL means "not sure" (#415): an all-NULL row has no attestation data, so
  // like an unjoined row it falls through to stars based on verification_method.
  const attestationProvided =
    provider.no_alcohol != null || provider.no_pork != null || provider.no_gambling != null;
  if (attestationProvided) {
    const hasAttestation =
      Boolean(provider.no_alcohol) || Boolean(provider.no_pork) || Boolean(provider.no_gambling);
    if (!hasAttestation) return 0;
  }

  if (provider.verification_method === 'online') return 1;
  return 3;
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
