/**
 * Canonical URL Utilities (Plan 035 — M2)
 *
 * ADR-005: Public acquisition pages use ISR; UTMs must not create duplicate
 * crawlable URLs. Canonicals strip query strings containing utm_* parameters.
 */

const UTM_PARAM_PATTERN = /^utm_/i;

/**
 * Strip UTM query parameters from a URL.
 * Preserves non-UTM parameters. Returns clean URL without trailing `?` if
 * all query params were UTM.
 */
export function stripUtmParams(url: string): string {
  const parsed = new URL(url);
  const keysToDelete: string[] = [];

  parsed.searchParams.forEach((_value, key) => {
    if (UTM_PARAM_PATTERN.test(key)) {
      keysToDelete.push(key);
    }
  });

  for (const key of keysToDelete) {
    parsed.searchParams.delete(key);
  }

  return parsed.toString();
}

/**
 * Generate a canonical URL for a city page.
 * Encodes the city name for URL safety and strips trailing slashes from siteUrl.
 */
export function generateCityCanonicalUrl(cityName: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const encoded = encodeURIComponent(cityName.trim());
  return `${base}/city/${encoded}`;
}
