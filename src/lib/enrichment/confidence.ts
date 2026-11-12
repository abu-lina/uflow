import { stringSimilarity } from '@/lib/enrichment/delivery-platform/provider-matcher';

/** Default threshold (0-100) at or above which candidates are auto-applied. */
export const AUTO_APPLY_CONFIDENCE_THRESHOLD = 85;

/**
 * Compute a 0-100 integer confidence score from two name strings.
 * Uses the existing Levenshtein-based similarity after normalisation.
 */
export function computeConfidenceScore(providerName: string, sourceName: string): number {
  const similarity = stringSimilarity(providerName, sourceName);
  return Math.round(similarity * 100);
}
