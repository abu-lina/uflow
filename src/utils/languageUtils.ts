/**
 * Language detection utilities
 */

export type SupportedLanguage = 'de' | 'en';

/**
 * Detect the user's preferred language from browser settings
 * Falls back to German if detection fails
 */
export function detectUserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'de'; // Server-side fallback
  }

  try {
    // Get browser language preference
    const browserLang = navigator.language || navigator.languages?.[0];
    
    if (browserLang) {
      // Extract language code (e.g., 'en-US' -> 'en')
      const langCode = browserLang.split('-')[0].toLowerCase();
      
      // Check if it's a supported language
      if (langCode === 'en') {
        return 'en';
      }
    }
  } catch (error) {
    console.warn('Failed to detect browser language:', error);
  }

  // Default to German
  return 'de';
}

/**
 * Get the appropriate description based on user's language preference
 */
export function getLocalizedDescription(
  descriptionDe?: string | null,
  descriptionEn?: string | null,
  fallback?: string
): string {
  const userLang = detectUserLanguage();
  
  // Try to get description in user's preferred language
  if (userLang === 'en' && descriptionEn) {
    return descriptionEn;
  }
  
  if (descriptionDe) {
    return descriptionDe;
  }
  
  // Fallback to English if German is not available
  if (descriptionEn) {
    return descriptionEn;
  }
  
  // Final fallback
  return fallback || '';
}

/**
 * Get the appropriate name based on user's language preference
 */
export function getLocalizedName(
  nameDe: string,
  nameEn?: string | null
): string {
  const userLang = detectUserLanguage();
  
  // Try to get name in user's preferred language
  if (userLang === 'en' && nameEn) {
    return nameEn;
  }
  
  // Fallback to German name
  return nameDe;
}
