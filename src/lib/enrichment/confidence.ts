import { stringSimilarity } from '@/lib/enrichment/delivery-platform/provider-matcher';

const DEFAULT_THRESHOLD = 85;

/** Threshold (0-100) at or above which candidates are auto-applied. Reads ENRICHMENT_CONFIDENCE_THRESHOLD env var at call time. */
export function getAutoApplyThreshold(): number {
  const env = process.env.ENRICHMENT_CONFIDENCE_THRESHOLD;
  if (env == null) return DEFAULT_THRESHOLD;
  const parsed = parseInt(env, 10);
  if (isNaN(parsed) || parsed < 50 || parsed > 100) return DEFAULT_THRESHOLD;
  return parsed;
}

/**
 * Compute a 0-100 integer confidence score from two name strings.
 * Uses the existing Levenshtein-based similarity after normalisation.
 */
export function computeConfidenceScore(providerName: string, sourceName: string): number {
  const similarity = stringSimilarity(providerName, sourceName);
  return Math.round(similarity * 100);
}
