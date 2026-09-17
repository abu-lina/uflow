/**
 * Maps JoinHalal servesCuisine values to the closest categories table entry.
 *
 * Pure function, no side effects. Accepts a preloaded categories list
 * to avoid database access at match time.
 *
 * Matching strategy:
 * 1. Split comma-separated cuisine string into tokens
 * 2. For each token, try exact match on name_de/name_en (case-insensitive)
 * 3. If no exact match, try "contains" matching (for compound names like "Kebab / Döner")
 * 4. If no contains match, try German adjective form ("Türkische" -> "Türkisch")
 * 5. Return first matched category_id, or null
 */

export interface CategoryRow {
  category_id: string;
  name_de: string | null;
  name_en: string | null;
}

/**
 * Terms that are too generic to map to a category.
 * These appear frequently in JoinHalal data but don't indicate a cuisine.
 */
const SKIP_TERMS = new Set([
  'halal',
  'restaurant',
  'essen',
  'food',
  'küche',
  'cuisine',
  'grill',
  'imbiss',
  'bistro',
  'café',
  'cafe',
  'snack',
  'fast food',
  'lieferservice',
  'takeaway',
  'speisekarte',
]);

/**
 * Strips common German cuisine adjective endings to get the base form.
 * "Türkische" -> "Türkisch", "Italienische" -> "Italienisch", etc.
 */
function stripGermanAdjectiveEnding(word: string): string {
  // "Türkische Küche" -> just take "Türkische" -> strip "e" -> "Türkisch"
  // "Arabische" -> "Arabisch"
  // "Griechische" -> "Griechisch"
  if (word.endsWith('sche')) {
    return word.slice(0, -1); // "Türkische" -> "Türkisch" (remove trailing 'e')
  }
  return word;
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().trim();
}

interface NormalizedCategory {
  id: string;
  nameDe: string;
  nameEn: string;
  nameParts: string[];
}

/** Cache the normalized category index per array reference to avoid
 *  rebuilding it on every mapCuisineToCategory call. */
const categoryIndexCache = new WeakMap<CategoryRow[], NormalizedCategory[]>();

function buildCategoryIndex(categories: CategoryRow[]): NormalizedCategory[] {
  const cached = categoryIndexCache.get(categories);
  if (cached) return cached;

  const index = categories.map((cat) => ({
    id: cat.category_id,
    nameDe: cat.name_de ? normalizeForMatch(cat.name_de) : '',
    nameEn: cat.name_en ? normalizeForMatch(cat.name_en) : '',
    nameParts: [
      ...(cat.name_de ? cat.name_de.split(/\s*\/\s*/).map(normalizeForMatch) : []),
      ...(cat.name_en ? cat.name_en.split(/\s*\/\s*/).map(normalizeForMatch) : []),
    ],
  }));
  categoryIndexCache.set(categories, index);
  return index;
}

/**
 * Maps a servesCuisine string to the closest category_id.
 *
 * @param cuisine Raw servesCuisine value from JoinHalal (comma-separated or single)
 * @param categories Preloaded list of category rows from the database
 * @returns category_id string or null if no match found
 */
export function mapCuisineToCategory(
  cuisine: string | null | undefined,
  categories: CategoryRow[],
): string | null {
  if (!cuisine || typeof cuisine !== 'string' || cuisine.trim() === '') return null;
  if (categories.length === 0) return null;

  // Split on comma and process each token
  const tokens = cuisine
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const categoryIndex = buildCategoryIndex(categories);

  for (const rawToken of tokens) {
    const token = normalizeForMatch(rawToken);

    // Skip generic terms
    if (SKIP_TERMS.has(token)) continue;

    // Extract the first word for multi-word tokens like "Türkische Küche"
    const firstWord = token.split(/\s+/)[0];

    // 1. Exact match on name_de or name_en
    for (const cat of categoryIndex) {
      if (cat.nameDe === token || cat.nameEn === token) {
        return cat.id;
      }
    }

    // 2. Contains match (for "Kebab / Döner" matching "Döner" or "Kebab")
    for (const cat of categoryIndex) {
      for (const part of cat.nameParts) {
        if (part === token) {
          return cat.id;
        }
      }
    }

    // 3. Try German adjective form: "Türkische" -> "Türkisch"
    const stripped = normalizeForMatch(stripGermanAdjectiveEnding(rawToken.split(/\s+/)[0]));
    if (stripped !== token && stripped !== firstWord) {
      for (const cat of categoryIndex) {
        if (cat.nameDe === stripped || cat.nameEn === stripped) {
          return cat.id;
        }
      }
    }

    // 4. Partial match: token is contained in category name or vice versa
    // Useful for "Chicken" matching "Fried Chicken"
    // Minimum length of 5 avoids false positives from short tokens like "Thai" matching unrelated categories
    for (const cat of categoryIndex) {
      if (token.length >= 5 && (cat.nameDe.includes(token) || cat.nameEn.includes(token))) {
        return cat.id;
      }
    }
  }

  return null;
}
