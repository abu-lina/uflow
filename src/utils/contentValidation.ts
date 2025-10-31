/**
 * Content validation utilities for offers and needs
 * Helps prevent duplicates, similar entries, and inappropriate content
 */

/**
 * Normalize text for comparison (lowercase, trim, remove special chars)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (identical) and 1 (completely different)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 0; // Identical
  
  // Check if one contains the other (for cases like "Beratung" vs "Beratungen")
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    // If shorter is >80% of longer, consider it very similar
    return shorter.length / longer.length < 0.8 ? 0.2 : 0.1;
  }
  
  // Levenshtein distance algorithm
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return 1;
  if (len2 === 0) return 1;
  
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return distance / maxLen;
}

/**
 * Check if two strings are similar (within threshold)
 */
export function isSimilar(str1: string, str2: string, threshold: number = 0.3): boolean {
  return calculateSimilarity(str1, str2) <= threshold;
}

/**
 * Find similar items in a list
 */
export function findSimilarItems<T extends { name_de: string }>(
  searchTerm: string,
  items: T[],
  threshold: number = 0.3,
  maxResults: number = 5
): T[] {
  const results: Array<{ item: T; similarity: number }> = [];
  
  for (const item of items) {
    const similarity = calculateSimilarity(searchTerm, item.name_de);
    if (similarity <= threshold && item.name_de.toLowerCase() !== searchTerm.toLowerCase()) {
      results.push({ item, similarity });
    }
  }
  
  // Sort by similarity (most similar first)
  results.sort((a, b) => a.similarity - b.similarity);
  
  return results.slice(0, maxResults).map(r => r.item);
}

/**
 * Basic German profanity/inappropriate words list
 * Add more as needed
 */
const INAPPROPRIATE_WORDS = [
  // Common German profanity (keeping it basic for now)
  'arsch', 'scheiß', 'scheisse', 'fick', 'fotze', 'hurensohn',
  'schwuchtel', 'wichser', 'drecksau', 'hure',
  // English profanity that might be used
  'fuck', 'shit', 'asshole', 'bitch',
  // Insults
  'idiot', 'dumm', 'blöd', 'depp', 'trottel',
];

/**
 * Check if text contains inappropriate content
 */
export function containsInappropriateContent(text: string): boolean {
  const normalizedText = normalizeText(text);
  return INAPPROPRIATE_WORDS.some(word => normalizedText.includes(word));
}

/**
 * Validate offer/need name
 * Returns an object with validation results
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  similarItems?: Array<{ name_de: string }>;
  shouldAutoSelect?: { item: { name_de: string }; similarity: number };
}

export function validateOfferOrNeedName(
  name: string,
  existingItems: Array<{ name_de: string }> = [],
  checkSimilarity: boolean = true
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const normalized = normalizeText(name);
  
  // Required field
  if (!name.trim()) {
    errors.push('Der Name darf nicht leer sein');
    return { isValid: false, errors, warnings };
  }
  
  // Minimum length (check normalized to avoid issues with special chars)
  if (normalized.length < 2) {
    errors.push('Der Name muss mindestens 2 Zeichen lang sein');
  }
  
  // Maximum length
  if (name.length > 100) {
    errors.push('Der Name darf maximal 100 Zeichen lang sein');
  }
  
  // Check for inappropriate content
  if (containsInappropriateContent(name)) {
    errors.push('Der Name enthält unangemessene Inhalte');
  }
  
  // Check for exact duplicate (case-insensitive, normalized)
  const exactMatch = existingItems.find(
    item => normalizeText(item.name_de) === normalized
  );
  if (exactMatch) {
    errors.push(`Ein Eintrag mit dem Namen "${exactMatch.name_de}" existiert bereits`);
  }
  
  // Check for similar items and determine if we should auto-select
  let similarItems: Array<{ name_de: string }> | undefined;
  let shouldAutoSelect: { item: { name_de: string }; similarity: number } | undefined;
  
  if (checkSimilarity && existingItems.length > 0) {
    // Find all similar items with their similarity scores
    const allSimilar: Array<{ item: { name_de: string }; similarity: number }> = [];
    
    for (const item of existingItems) {
      const similarity = calculateSimilarity(name, item.name_de);
      // Only consider items that are actually similar (not exact matches, which are already handled above)
      if (similarity <= 0.9 && normalizeText(item.name_de) !== normalized) {
        allSimilar.push({ item, similarity });
      }
    }
    
    // Sort by similarity (most similar first)
    allSimilar.sort((a, b) => a.similarity - b.similarity);
    
    // If there's a very similar item (>= 0.85 similarity), auto-select it instead of creating
    if (allSimilar.length > 0 && allSimilar[0].similarity <= 0.85) {
      shouldAutoSelect = allSimilar[0];
      errors.push(
        `Ein sehr ähnlicher Eintrag existiert bereits: "${allSimilar[0].item.name_de}". Bitte verwenden Sie den vorhandenen Eintrag.`
      );
    } else if (allSimilar.length > 0) {
      // Medium similarity - show as warnings but allow with confirmation
      similarItems = allSimilar.slice(0, 3).map(s => s.item);
      warnings.push(
        `Ähnliche Einträge gefunden: ${similarItems.map(s => `"${s.name_de}"`).join(', ')}`
      );
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    similarItems,
    shouldAutoSelect,
  };
}

