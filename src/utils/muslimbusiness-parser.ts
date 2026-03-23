/**
 * Pure parsing utilities for the MuslimBusiness data import pipeline.
 *
 * All functions are side-effect-free (no network, no database).
 * They are consumed by scripts/import-muslimbusiness.ts and tested via vitest.
 *
 * Source: public directory at muslimbusiness.de/datenbank
 * Data is extracted from server-rendered card markup where each provider card
 * contains labeled lines: Standorte, Branchen, Email, Telefon, Social Media.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawMuslimBusinessCard {
  name: string;
  standorte: string;
  branchen: string;
  email: string;
  telefon: string;
  socialMedia: string;
}

// ---------------------------------------------------------------------------
// Placeholder tokens observed in the source
// ---------------------------------------------------------------------------

const PLACEHOLDER_TOKENS = new Set(['-', '/', 'nicht angegeben', 'n.a', '']);

// ---------------------------------------------------------------------------
// isPlaceholder
// ---------------------------------------------------------------------------

/**
 * Returns true if the value is a known placeholder token from the source.
 *
 * muslimbusiness.de uses various tokens for "no value":
 *   - "-"
 *   - "/"
 *   - "Nicht angegeben"
 *   - "N.a"
 *   - empty / whitespace
 */
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_TOKENS.has(value.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// extractProviderCardsFromHtml
// ---------------------------------------------------------------------------

/**
 * Extracts provider card data from the muslimbusiness.de/datenbank HTML.
 *
 * Each card in the rendered HTML follows a consistent pattern:
 *   <h3>Provider Name</h3>
 *   ... Standorte: values ...
 *   ... Branchen: values ...
 *   ... Email: value ...
 *   ... Telefon: value ...
 *   ... Social Media: value ...
 *
 * We extract cards by finding all <h3> headings and then searching the
 * text between each heading for the labeled fields.
 */
export function extractProviderCardsFromHtml(html: string): RawMuslimBusinessCard[] {
  const cards: RawMuslimBusinessCard[] = [];

  // Split the HTML by h3 tags to find card boundaries
  // Each card starts with an <h3> containing the provider name
  const h3Pattern = /<h3[^>]*>(.*?)<\/h3>/gi;
  const matches: Array<{ name: string; startOfH3: number; endOfH3: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = h3Pattern.exec(html)) !== null) {
    const name = stripHtmlTags(match[1]).trim();
    if (name) {
      matches.push({
        name,
        startOfH3: match.index,
        endOfH3: match.index + match[0].length,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].endOfH3;
    // End at the start of the next <h3> tag (not after it)
    const endIdx = i + 1 < matches.length ? matches[i + 1].startOfH3 : html.length;
    const cardHtml = html.slice(startIdx, endIdx);

    // Strip HTML tags to get plain text for label extraction
    const cardText = stripHtmlTags(cardHtml);

    cards.push({
      name: matches[i].name,
      standorte: extractLabeledValue(cardText, 'Standorte'),
      branchen: extractLabeledValue(cardText, 'Branchen'),
      email: extractLabeledValue(cardText, 'Email'),
      telefon: extractLabeledValue(cardText, 'Telefon'),
      socialMedia: extractLabeledValue(cardText, 'Social Media'),
    });
  }

  return cards;
}

// ---------------------------------------------------------------------------
// parseStandorte
// ---------------------------------------------------------------------------

/**
 * Parses the comma-separated Standorte string into an array of location strings.
 *
 * Does NOT filter out virtual locations like "Online" or "Deutschlandweit" —
 * that decision is left to the caller (extractPrimaryCity).
 */
export function parseStandorte(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// parseBranchen
// ---------------------------------------------------------------------------

/**
 * Parses the comma-separated Branchen string into an array of category strings.
 * Trims whitespace and filters out empty entries.
 */
export function parseBranchen(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// normalizeSocialMedia
// ---------------------------------------------------------------------------

/**
 * Normalizes the Social Media field from muslimbusiness.de.
 *
 * Observed formats:
 *   - Handle: "hadries.pack", "deen_akademie"
 *   - @handle: "@akhiracare"
 *   - Instagram URL: "https://www.instagram.com/immo_funnels/"
 *   - LinkedIn URL: "www.linkedin.com/in/awalter-dl"
 *   - "Instagram: @clickclick.design" prefix
 *   - Placeholder: "-", "/", "Nicht angegeben", "N.a", empty
 *
 * Returns null for placeholders, otherwise the cleaned value.
 */
export function normalizeSocialMedia(value: string): string | null {
  const trimmed = value.trim();
  if (isPlaceholder(trimmed)) return null;

  let cleaned = trimmed;

  // Strip "Instagram: " prefix
  if (cleaned.toLowerCase().startsWith('instagram:')) {
    cleaned = cleaned.slice('instagram:'.length).trim();
  }

  // Strip leading @
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1);
  }

  // Strip trailing slash from handles (not URLs)
  if (!cleaned.includes('://') && !cleaned.includes('/in/') && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || null;
}

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

/**
 * Normalizes the Telefon field from muslimbusiness.de.
 *
 * Returns null for placeholders, otherwise the trimmed phone string.
 * Phone formatting is preserved (the import does not reformat).
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (isPlaceholder(trimmed)) return null;
  return trimmed || null;
}

// ---------------------------------------------------------------------------
// extractPrimaryCity
// ---------------------------------------------------------------------------

/**
 * Returns the first physical city from a parsed Standorte list.
 *
 * Skips virtual / non-city entries:
 *   - "Online"
 *   - "Deutschlandweit"
 *
 * Returns null if no physical city is found.
 */
const NON_CITY_VALUES = new Set(['online', 'deutschlandweit']);

export function extractPrimaryCity(cities: string[]): string | null {
  for (const city of cities) {
    if (!NON_CITY_VALUES.has(city.toLowerCase())) {
      return city;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strips HTML tags from a string, returning plain text.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Extracts the value after a "Label:" pattern from plain text.
 *
 * Searches for "Label:" (case-insensitive) and captures everything
 * until the next known label or end of text.
 */
function extractLabeledValue(text: string, label: string): string {
  // Known labels in order of appearance
  const allLabels = ['Standorte', 'Branchen', 'Email', 'Telefon', 'Social Media'];

  // Build a pattern that captures from "Label:" to the next label or end
  const labelIdx = allLabels.indexOf(label);
  const nextLabels = allLabels.slice(labelIdx + 1);

  // Build the stop pattern: next labels, common card noise, or end
  // For the last label (Social Media), we stop at common noise patterns
  const stopAlternatives = [
    ...nextLabels.map((l) => escapeRegex(l) + ':'),
    '\\d+%\\s*RABATT',    // Promo text like "15%RABATT"
    'SUPPORTER',           // [SUPPORTER] badge
    'Neu\\b',             // "Neu" badge
    'White Week',          // White Week promo
  ];

  const stopPattern = `(?=${stopAlternatives.join('|')}|$)`;

  const pattern = new RegExp(
    escapeRegex(label) + ':\\s*' + '(.*?)' + '\\s*' + stopPattern,
    'is'
  );

  const match = text.match(pattern);
  if (!match) return '';

  return match[1].trim();
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
