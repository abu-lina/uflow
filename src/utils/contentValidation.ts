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
 * Check if two strings are synonyms (common German patterns)
 * Returns true ONLY for true synonyms: plural/singular, minor typos, abbreviations
 * Does NOT match semantically related words (e.g., "Mittagessen" vs "Mittagstisch")
 */
export function areSynonyms(str1: string, str2: string): boolean {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return true;
  
  // STRICT: Only match plural/singular variations
  // Pattern: Remove common German plural endings (e, en, er, n, s) and check if base matches
  const removePlural = (s: string): string => {
    // Try removing common plural endings
    const patterns = [
      /^(.*)(en|er|e|n)$/, // Most common: Beratungen -> Beratung
      /^(.*)s$/, // English-style: Kurses -> Kurs (less common in German but possible)
    ];
    
    for (const pattern of patterns) {
      const match = s.match(pattern);
      if (match && match[1].length >= 3) {
        return match[1]; // Return the base word
      }
    }
    return s; // No plural ending found, return as-is
  };
  
  const base1 = removePlural(s1);
  const base2 = removePlural(s2);
  
  // If removing plural endings makes them match, they're synonyms
  if (base1 === base2 && base1.length >= 3) {
    // Additional check: ensure one is clearly a plural/singular of the other
    // Both should be similar length (not drastically different)
    const lengthDiff = Math.abs(s1.length - s2.length);
    if (lengthDiff <= 4) { // Plural endings typically add 1-4 characters
      return true;
    }
  }
  
  // STRICT: Check for simple typos (single character difference in short words only)
  // Only for very short words (≤6 chars) to avoid false positives
  if (s1.length <= 6 && s2.length <= 6) {
    const lengthDiff = Math.abs(s1.length - s2.length);
    if (lengthDiff <= 1) {
      const edits = countEdits(s1, s2);
      // Only 1 edit allowed for short words (catches "Kaffee" vs "Kaffe")
      if (edits === 1) {
        return true;
      }
    }
  }
  
  // DO NOT match:
  // - Compound words that share a root (e.g., "Mittagessen" vs "Mittagstisch")
  // - Semantically related but distinct terms
  // - Words that are just similar (use similarity score instead, not synonym detection)
  
  return false;
}

/**
 * Count minimum edits between two strings (simplified)
 */
function countEdits(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (Math.abs(str1.length - str2.length) > 1) return 999;
  
  let edits = 0;
  const minLen = Math.min(str1.length, str2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) {
      edits++;
    }
  }
  
  edits += Math.abs(str1.length - str2.length);
  return edits;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (identical/synonym) and 1 (completely different)
 * Synonyms return very low similarity scores (< 0.15) to trigger auto-selection
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 0; // Identical
  
  // Check if they are synonyms (plural/singular, typos, variations)
  if (areSynonyms(str1, str2)) {
    return 0.05; // Very high similarity - will trigger auto-selection
  }
  
  // Check if one contains the other (for cases like "Beratung" vs "Beratungen")
  // BUT: Be strict - only if it's clearly a plural/singular relationship
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    // Only consider it very similar if:
    // 1. Shorter is >85% of longer (almost identical, just plural ending)
    // 2. AND the difference is small (1-4 chars, typical for plural endings)
    const lengthRatio = shorter.length / longer.length;
    const lengthDiff = longer.length - shorter.length;
    
    if (lengthRatio >= 0.85 && lengthDiff <= 4) {
      return 0.1; // Very similar - likely plural/singular - will trigger auto-selection
    }
    
    // For other substring relationships, use regular similarity calculation
    // Don't treat as very similar just because they share a substring
  }
  
  // Levenshtein distance algorithm for other similarities
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
    
    // Determine if we should auto-select or show warnings
    if (allSimilar.length > 0) {
      const topSimilar = allSimilar[0];
      
      // Category 1: True synonyms (plural/singular, minor typos) - ALWAYS auto-select
      if (topSimilar.similarity <= 0.15) {
        const isTrueSynonym = areSynonyms(name, topSimilar.item.name_de);
        if (isTrueSynonym) {
          shouldAutoSelect = topSimilar;
          errors.push(
            `Ein sehr ähnlicher Eintrag existiert bereits: "${topSimilar.item.name_de}". Bitte verwenden Sie den vorhandenen Eintrag.`
          );
        }
        // If similarity <= 0.15 but NOT a true synonym, don't auto-select
        // Let the user decide (it might be a legitimate different term)
      }
      // Category 2: Very high similarity (15-30% different) - likely duplicates, auto-select
      // BUT: Only if they share a significant portion (to avoid false positives like "Mittagessen" vs "Mittagstisch")
      else if (topSimilar.similarity <= 0.3) {
        // Additional check: ensure the words share enough content to be considered duplicates
        // "Mittagessen" (13 chars) vs "Mittagstisch" (13 chars) share "mittag" but different endings
        // Similarity ~0.31-0.38 would pass, but they're distinct concepts
        // Only auto-select if very short words or if they're almost identical
        const shorter = name.length < topSimilar.item.name_de.length ? name : topSimilar.item.name_de;
        
        // For very short words (≤8 chars), auto-select if similarity is high
        // For longer words, be more conservative - they might be distinct concepts
        if (shorter.length <= 8 || topSimilar.similarity <= 0.2) {
          shouldAutoSelect = topSimilar;
          errors.push(
            `Ein sehr ähnlicher Eintrag existiert bereits: "${topSimilar.item.name_de}". Bitte verwenden Sie den vorhandenen Eintrag.`
          );
        }
        // Otherwise (longer words, 20-30% different), show as warning but allow creation
      }
      // Category 3: Medium-high similarity (30-85% different) - related but distinct terms
      // For items like "Mittagessen" vs "Mittagstisch", show as warning but allow creation
      // Don't auto-select - let user decide
    }
    
    // If we haven't auto-selected and there are similar items, show them as warnings
    if (!shouldAutoSelect && allSimilar.length > 0) {
      // Show similar items that are worth warning about but not auto-selecting
      // Filter out items that would have been auto-selected
      const warningCandidates = allSimilar.filter(similar => {
        // Skip true synonyms (would have been auto-selected in Category 1)
        if (similar.similarity <= 0.15 && areSynonyms(name, similar.item.name_de)) return false;
        // Skip very high similarity items (would have been auto-selected in Category 2)
        const shorter = name.length < similar.item.name_de.length ? name : similar.item.name_de;
        if (similar.similarity <= 0.3) {
          // Only skip if it would have been auto-selected (short words or very high similarity)
          if (shorter.length <= 8 || similar.similarity <= 0.2) return false;
        }
        // Show items with medium-high similarity (30-85% different) - related but distinct terms
        // This catches cases like "Mittagessen" vs "Mittagstisch" - related but distinct
        return similar.similarity <= 0.85;
      });
      
      // Only show unique items (not synonyms of each other)
      const uniqueSimilar: Array<{ name_de: string }> = [];
      const seen = new Set<string>();
      
      for (const similar of warningCandidates.slice(0, 5)) {
        const normalizedName = normalizeText(similar.item.name_de);
        // Skip if we've already seen a synonym of this item
        let isDuplicate = false;
        for (const seenName of Array.from(seen)) {
          if (areSynonyms(similar.item.name_de, seenName)) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate && uniqueSimilar.length < 3) {
          uniqueSimilar.push(similar.item);
          seen.add(normalizedName);
        }
      }
      
      if (uniqueSimilar.length > 0) {
        similarItems = uniqueSimilar;
        warnings.push(
          `Ähnliche Einträge gefunden: ${similarItems.map(s => `"${s.name_de}"`).join(', ')}. Sind Sie sicher, dass Sie einen neuen Eintrag erstellen möchten?`
        );
      }
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

