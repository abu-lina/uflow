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
  const config = parseVxConfig(html);
  if (!config) return null;
  const name = config.display_name;
  if (!name || typeof name !== 'string') return null;
  return decodeHtmlEntities(name.trim());
}

// ---------------------------------------------------------------------------
// extractJoinHalalPostId (Plan 052)
// ---------------------------------------------------------------------------

/**
 * Extracts the WordPress/Voxel post ID from the vxconfig JSON embedded in the page.
 * This is the immutable integer primary key used as the upsert conflict identifier.
 *
 * Returns the post ID as a string (for TEXT column storage), or null if absent.
 */
export function extractJoinHalalPostId(html: string): string | null {
  const config = parseVxConfig(html);
  if (!config) return null;
  const id = config.id;
  if (typeof id !== 'number' || !Number.isFinite(id)) return null;
  return String(id);
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
// isJoinHalalDetailUrl
// ---------------------------------------------------------------------------

/**
 * Returns true only for JoinHalal provider detail page URLs.
 *
 * Detail pages match: /locations/{category-slug}/{name-slug}/
 * (exactly 3 non-empty path segments under /locations/).
 *
 * Listing pages like /locations/ or /locations/restaurant/ are rejected.
 */
export function isJoinHalalDetailUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { pathname } = new URL(url);
    // Normalise: strip trailing slash, split, filter empty
    const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);
    // Must be exactly: ['locations', '{category}', '{name}']
    return segments.length === 3 && segments[0] === 'locations';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// extractUrlsFromSitemapXml
// ---------------------------------------------------------------------------

/**
 * Extracts all <loc> URLs from a sitemap XML string.
 * Works for both sitemap index files and regular sitemaps.
 * Filters out non-detail URLs (listing pages) so only provider
 * detail page candidates are returned.
 */
export function extractUrlsFromSitemapXml(xml: string): string[] {
  if (!xml) return [];
  const matches = xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi);
  return Array.from(matches, (m) => m[1].trim()).filter(isJoinHalalDetailUrl);
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
// extractSpeisen
// ---------------------------------------------------------------------------

/**
 * Extracts food offerings ("Speisen") from a JoinHalal Schema.org entity.
 *
 * The source field is `additionalProperty[name="Speisen"]` with a comma-
 * delimited string value. Returns a deduplicated, trimmed array of non-empty
 * food terms, preserving original casing.
 */
export function extractSpeisen(schema: JoinHalalSchemaData): string[] {
  const props = schema.additionalProperty;
  if (!props || props.length === 0) return [];

  const entry = props.find((p) => p.name === 'Speisen');
  if (!entry?.value) return [];

  const items = entry.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return Array.from(new Set(items));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Shared vxconfig parser — extracts current_post from the Voxel theme
 * configuration JSON embedded in JoinHalal pages.
 *
 * Used by extractDisplayNameFromHtml (name) and extractJoinHalalPostId (id).
 */
interface VxConfigCurrentPost {
  display_name?: string;
  id?: number;
}

function parseVxConfig(html: string): VxConfigCurrentPost | null {
  if (!html) return null;
  // Real JoinHalal pages have multiple vxconfig blocks; only one contains
  // current_post. Iterate all matches and return the first with that key.
  const regex = /<script[^>]*class="vxconfig"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const config = JSON.parse(match[1]) as {
        current_post?: VxConfigCurrentPost;
      };
      if (config?.current_post) return config.current_post;
    } catch {
      // Skip unparseable blocks
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// hasAlkoholverkauf (Plan 051, extended Plan 057)
// ---------------------------------------------------------------------------

/**
 * Extracts badge text labels from the visible "Halal Merkmale" section of
 * a JoinHalal detail page. The section is identified by an <h3> heading
 * containing "Halal Merkmale" (or "Halal-Merkmale"), followed by a sibling
 * <ul class="...ts-advanced-list"> with <li> badge items.
 *
 * Returns an empty array when the section is absent or contains no badges.
 *
 * @param html Raw HTML string from a JoinHalal detail page.
 */
export function extractHalalBadgesFromHtml(html: string): string[] {
  // Find the Halal Merkmale heading (space or hyphen variant)
  const headingMatch = html.match(
    /<h3[^>]*>Halal[\s-]Merkmale<\/h3>/i
  );
  if (!headingMatch) return [];

  // Search for the next ts-advanced-list <ul> after the heading
  const headingIndex = headingMatch.index ?? 0;
  const afterHeading = html.slice(headingIndex + headingMatch[0].length);
  const listMatch = afterHeading.match(
    /<ul[^>]*ts-advanced-list[^>]*>([\s\S]*?)<\/ul>/i
  );
  if (!listMatch) return [];

  const listHtml = listMatch[1];

  // Extract text from each badge item's ts-action-con div.
  // Pattern: <div class="ts-action-con">...<icon div>...</div>BADGE TEXT</div>
  const badges: string[] = [];
  const itemRegex = /<div\s+class="ts-action-con">([\s\S]*?)<\/div>\s*<\/li>/gi;
  let match;
  while ((match = itemRegex.exec(listHtml)) !== null) {
    // The badge text is after the last closing </div> of the icon wrapper
    const content = match[1];
    // Strip the icon div and extract remaining text
    const textOnly = content.replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '').trim();
    if (textOnly) {
      badges.push(textOnly);
    }
  }

  return badges;
}

/**
 * Returns true when the JoinHalal page indicates alcohol sale.
 *
 * Detection order (Plan 057):
 * 1. JSON-LD `additionalProperty` with name matching "halal merkmale" or
 *    "halal-merkmale" and a comma-separated value containing exact token
 *    "alkoholverkauf" (case-insensitive).
 * 2. Fallback: visible HTML badge list under the "Halal Merkmale" heading.
 *    Exact badge text "Alkoholverkauf" → true.
 *    Exact badge text "Kein Alkoholverkauf" → false (explicit negative).
 *
 * Returns false when neither source provides a decisive signal — safe
 * default that leaves `review_status` on the existing `pending` path.
 */
export function hasAlkoholverkauf(
  schema: JoinHalalSchemaData,
  html?: string
): boolean {
  // --- Primary: structured JSON-LD ---
  const props = schema.additionalProperty;
  if (Array.isArray(props) && props.length > 0) {
    const halalProp = props.find((p) => {
      const normalized = p.name?.trim().toLowerCase().replace(/-/g, ' ');
      return normalized === 'halal merkmale';
    });
    if (halalProp?.value) {
      const values = halalProp.value.split(',').map((v) => v.trim().toLowerCase());
      if (values.includes('alkoholverkauf')) return true;
    }
  }

  // --- Fallback: visible HTML badges (Plan 057) ---
  if (html) {
    const badges = extractHalalBadgesFromHtml(html);
    for (const badge of badges) {
      const normalized = badge.trim().toLowerCase();
      if (normalized === 'kein alkoholverkauf') return false;
      if (normalized === 'alkoholverkauf') return true;
    }
  }

  return false;
}

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
