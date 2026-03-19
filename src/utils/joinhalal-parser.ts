/**
 * Pure parsing utilities for the JoinHalal data import pipeline.
 *
 * All functions are side-effect-free (no network, no database).
 * They are consumed by scripts/import-joinhalal.ts and tested via vitest.
 *
 * Source: public listings at joinhalal.com (WordPress + Voxel theme + Rank Math).
 * Data is extracted from the server-side rendered Schema.org JSON-LD embedded in
 * each page's <head> by the Rank Math SEO plugin — no JavaScript rendering required.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JoinHalalSchemaData {
  '@type'?: string;
  name?: string;
  description?: string;
  address?: {
    '@type'?: string;
    streetAddress?: string;
    addressLocality?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude?: string;
    longitude?: string;
  };
  url?: string;
  email?: string;
  telephone?: string;
  sameAs?: string | string[];
  additionalProperty?: Array<{
    '@type'?: string;
    name?: string;
    value?: string;
  }>;
  [key: string]: unknown;
}

export interface ParsedAddress {
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
}

// ---------------------------------------------------------------------------
// extractSchemaOrgFromHtml
// ---------------------------------------------------------------------------

/**
 * Extracts the first business-typed entry from the Rank Math Schema.org JSON-LD
 * embedded in the <head> of each joinhalal.com page.
 *
 * The script tag has class="rank-math-schema-pro" and contains a @graph array.
 * Index 0 is always the business entity (Restaurant, FoodEstablishment, etc.).
 * Subsequent nodes are Organization, WebSite, WebPage — we skip those.
 *
 * Returns null if the script tag is absent or unparseable.
 */
export function extractSchemaOrgFromHtml(html: string): JoinHalalSchemaData | null {
  // Match the rank-math-schema-pro script tag (server-side rendered, no JS needed)
  const scriptMatch = html.match(
    /<script[^>]*class="rank-math-schema-pro"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!scriptMatch) return null;

  try {
    const parsed = JSON.parse(scriptMatch[1]) as {
      '@graph'?: JoinHalalSchemaData[];
    };
    const graph = parsed['@graph'];
    if (!Array.isArray(graph) || graph.length === 0) return null;

    // Index 0 is the business entity. Validate it has a type that signals a location
    const first = graph[0];
    if (!first || typeof first !== 'object') return null;

    return first;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// extractDisplayNameFromHtml
// ---------------------------------------------------------------------------

/**
 * Extracts the Voxel theme display_name from the vxconfig JSON embedded in the page.
 * This is the cleanest business name source — it matches the breadcrumb label exactly.
 *
 * Example: {"current_post":{"display_name":"Etem Burger & Steak | München"}}
 *
 * HTML entities in display_name are decoded (e.g., &amp; → &).
 */
export function extractDisplayNameFromHtml(html: string): string | null {
  const scriptMatch = html.match(
    /<script[^>]*class="vxconfig"[^>]*>([\s\S]*?)<\/script>/i
  );
  if (!scriptMatch) return null;

  try {
    const config = JSON.parse(scriptMatch[1]) as {
      current_post?: { display_name?: string };
    };
    const name = config?.current_post?.display_name;
    if (!name || typeof name !== 'string') return null;
    return decodeHtmlEntities(name.trim());
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// parseGermanAddress
// ---------------------------------------------------------------------------

/**
 * Parses the German compound address string from Schema.org streetAddress.
 *
 * Format observed on joinhalal.com:
 *   "Street Name Number, ZIPCODE City[, District], Deutschland"
 *
 * Examples:
 *   "Preußenstraße 5, 80809 München, Deutschland"
 *   "Berger Str. 222, 60385 Frankfurt am Main-Bornheim/Ostend, Deutschland"
 *   "Zollernstraße 9, 86154 Augsburg, Augsburg-Oberhausen, Deutschland"
 *
 * Algorithm:
 *   1. Split on ", " — carefully handle multi-part cities.
 *   2. First segment = street.
 *   3. Second segment starts with a 5-digit ZIP, followed by city name.
 *   4. Remaining segments (before optional "Deutschland") = district/ignored.
 *
 * Returns null fields for unparseable input.
 */
export function parseGermanAddress(streetAddress: string): ParsedAddress {
  if (!streetAddress || typeof streetAddress !== 'string') {
    return { street: null, zip: null, city: null, country: null };
  }

  // Split keeping "Frankfurt am Main" together (it contains spaces but not commas)
  const parts = streetAddress
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return { street: null, zip: null, city: null, country: null };
  }

  const street = parts[0] || null;

  // Second part should start with a 5-digit German ZIP code
  const zipCityMatch = parts[1].match(/^(\d{5})\s+(.+)$/);
  if (!zipCityMatch) {
    return { street, zip: null, city: null, country: 'DE' };
  }

  const zip = zipCityMatch[1];
  // The city may include district after a dash (e.g., "Frankfurt am Main-Bornheim/Ostend")
  // We want just the city name before any district suffix
  const rawCity = zipCityMatch[2];
  // Strip district portion after a hyphen/slash that comes after the city name
  // "Frankfurt am Main-Bornheim/Ostend" → "Frankfurt am Main"
  // "München" → "München" (no change)
  // "Augsburg" → "Augsburg"
  const city = rawCity.replace(/-[^/\s].*$/, '').trim();

  return { street, zip, city, country: 'DE' };
}

// ---------------------------------------------------------------------------
// extractInstagramFromSameAs
// ---------------------------------------------------------------------------

/**
 * Extracts the first instagram.com URL from a Schema.org sameAs value.
 *
 * joinhalal.com encodes sameAs as a comma-separated string:
 *   "https://www.instagram.com/foo/, https://www.facebook.com/Bar"
 *
 * Returns null if no instagram URL is found.
 */
export function extractInstagramFromSameAs(
  sameAs: string | string[] | null | undefined
): string | null {
  if (!sameAs) return null;

  const urls: string[] = Array.isArray(sameAs)
    ? sameAs
    : sameAs.split(',').map((u) => u.trim());

  const instagram = urls.find((u) => u.includes('instagram.com'));
  return instagram ?? null;
}

// ---------------------------------------------------------------------------
// cleanProviderName
// ---------------------------------------------------------------------------

/**
 * Returns the cleanest available business name.
 *
 * Priority:
 *  1. Voxel display_name (already clean, HTML entities decoded) — use if available.
 *  2. Strip the " in {City} - joinhalal | Finde Halal Spots" suffix from the
 *     Schema.org name, then decode HTML entities.
 *
 * The Schema.org name template is:
 *   "{BusinessName} in {City} - joinhalal | Finde Halal Spots"
 *
 * We strip from " in " onwards, but only the last occurrence that precedes
 * "joinhalal" to handle cases where "in" appears in the business name itself.
 */
export function cleanProviderName(
  schemaName: string,
  displayName: string | null
): string {
  if (displayName) return displayName.trim();

  // Decode HTML entities first
  let name = decodeHtmlEntities(schemaName);

  // Remove the " - joinhalal | ..." tail
  const joinHalalIdx = name.lastIndexOf(' - joinhalal');
  if (joinHalalIdx > 0) {
    name = name.slice(0, joinHalalIdx);
  }

  // Remove the " in {City}" suffix that Rank Math appends
  // Pattern: " in <text>" at the end — conservative: only strip if no "in" appears
  // in the business name portion. We use a greedy last-match approach.
  const inCityMatch = name.match(/^(.*)\s+in\s+[^\s].+$/);
  if (inCityMatch) {
    name = inCityMatch[1];
  }

  return name.trim();
}

// ---------------------------------------------------------------------------
// extractUrlsFromSitemapXml
// ---------------------------------------------------------------------------

/**
 * Extracts all <loc> URLs from a sitemap XML string.
 * Works for both sitemap index files and regular sitemaps.
 */
export function extractUrlsFromSitemapXml(xml: string): string[] {
  if (!xml) return [];
  const matches = xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
  return Array.from(matches, (m) => m[1].trim());
}

// ---------------------------------------------------------------------------
// extractCategoryFromUrl
// ---------------------------------------------------------------------------

/**
 * Extracts the category slug from a joinhalal.com location URL.
 *
 * URL pattern: https://joinhalal.com/locations/{categorySlug}/{nameSlug}-{id}/
 *
 * Returns null for unexpected URL formats.
 */
export function extractCategoryFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/locations\/([^/]+)\//);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Decodes common HTML entities in a string.
 * Handles the subset used by WordPress/Rank Math output.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
