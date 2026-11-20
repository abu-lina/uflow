import type { HalalTier } from '@/features/search/discoveryQuery';

/**
 * #939 halal tier rules, shared by the list search and the map pins (#982).
 * Gold is filtered with eq/not on the embed; silver and bronze need an `or`.
 */
export const TIER_EMBED =
  'food_providers!inner(verification_method, has_certificate, certificate_url, no_alcohol, no_pork, no_gambling)';

const GOLD_RULE = 'and(has_certificate.eq.true,certificate_url.not.is.null)';
const ATTESTATION = 'or(no_alcohol.eq.true,no_pork.eq.true,no_gambling.eq.true)';

/** silver+ = gold OR (onsite + attestation); bronze+ = gold OR (any verification + attestation). */
export const TIER_OR_RULES: Record<Exclude<HalalTier, 'gold'>, string> = {
  silver: `${GOLD_RULE},and(verification_method.eq.onsite,${ATTESTATION})`,
  bronze: `${GOLD_RULE},and(verification_method.not.is.null,${ATTESTATION})`,
};
