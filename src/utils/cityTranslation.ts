/**
 * City name translation utility
 * 
 * Translates city names to the user's preferred language using Nominatim API.
 * Results are cached to avoid repeated API calls.
 */

type Language = 'de' | 'en' | 'ar' | 'tr' | 'ur' | 'ps';

// Cache for translated city names
const cityTranslationCache = new Map<string, string>();

// Map language codes to Nominatim Accept-Language format
const languageMap: Record<Language, string> = {
  de: 'de',
  en: 'en',
  ar: 'ar',
  tr: 'tr',
  ur: 'ur',
  ps: 'ps',
};

/**
 * Translates a city name to the user's preferred language using Nominatim API
 * @param cityName - The city name to translate
 * @param language - The target language code
 * @returns The translated city name, or the original if translation fails
 */
export async function translateCityName(
  cityName: string,
  language: Language
): Promise<string> {
  if (!cityName || !cityName.trim()) {
    return cityName;
  }

  // Check cache first
  const cacheKey = `${cityName.toLowerCase()}_${language}`;
  const cached = cityTranslationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // If language is German or English, no translation needed (default languages)
  if (language === 'de' || language === 'en') {
    cityTranslationCache.set(cacheKey, cityName);
    return cityName;
  }

  try {
    // Use Nominatim search API to get city name in target language
    const acceptLanguage = languageMap[language] || 'en';
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(cityName)}&` +
      `addressdetails=1&` +
      `limit=1&` +
      `featuretype=city,town,village`,
      {
        headers: {
          'User-Agent': 'UmmahFlow/1.0',
          'Accept-Language': acceptLanguage,
        },
      }
    );

    if (!response.ok) {
      // If API call fails, return original city name
      cityTranslationCache.set(cacheKey, cityName);
      return cityName;
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      // Extract city name from the result
      const result = data[0];
      const translatedName = 
        result.address?.city || 
        result.address?.town || 
        result.address?.village || 
        result.name || 
        cityName;
      
      // Cache the result
      cityTranslationCache.set(cacheKey, translatedName);
      return translatedName;
    }

    // If no results, return original city name
    cityTranslationCache.set(cacheKey, cityName);
    return cityName;
  } catch (error) {
    console.warn('Error translating city name:', error);
    // On error, return original city name and cache it
    cityTranslationCache.set(cacheKey, cityName);
    return cityName;
  }
}

/**
 * Clears the city translation cache
 */
export function clearCityTranslationCache(): void {
  cityTranslationCache.clear();
}
