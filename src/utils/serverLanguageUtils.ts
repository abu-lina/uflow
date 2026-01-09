/**
 * Server-side language detection utilities
 * 
 * This file contains server-only utilities that use next/headers.
 * DO NOT import this file in client components.
 */

import 'server-only';

import { headers, cookies } from 'next/headers';

export type ServerLanguage = 'de' | 'en' | 'ar' | 'tr' | 'ur' | 'ps';

// Valid language codes (must match client-side)
const VALID_LANGUAGES: ServerLanguage[] = ['de', 'en', 'ar', 'tr', 'ur', 'ps'];

// Language mapping for variants (must match client-side)
const LANGUAGE_MAPPING: Record<string, ServerLanguage> = {
  'en': 'en',
  'de': 'de',
  'ar': 'ar',
  'tr': 'tr',
  'ur': 'ur',
  'ps': 'ps',
  'en-us': 'en',
  'en-gb': 'en',
  'en-ca': 'en',
  'en-au': 'en',
  'de-de': 'de',
  'de-at': 'de',
  'de-ch': 'de',
  'ar-sa': 'ar',
  'ar-ae': 'ar',
  'ar-eg': 'ar',
  'ar-ma': 'ar',
  'tr-tr': 'tr',
  'ur-pk': 'ur',
  'ur-in': 'ur',
  'ps-af': 'ps',
  'ps-pk': 'ps',
};

// Check if a language code is valid
function isValidLanguage(lang: string | null | undefined): lang is ServerLanguage {
  return lang !== null && lang !== undefined && VALID_LANGUAGES.includes(lang as ServerLanguage);
}

// Normalize language code (e.g., 'en-US' -> 'en', 'de-DE' -> 'de')
function normalizeLanguageCode(lang: string): string {
  return lang.toLowerCase().split('-')[0].trim();
}

/**
 * Detect language from server-side request (cookies and headers)
 * Used in server components and API routes
 * 
 * Detection priority (matches client-side logic):
 * 1. User preference cookie (explicit user choice - highest priority)
 * 2. Accept-Language header (auto-detection - only if no saved preference)
 * 3. Default fallback to German
 * 
 * @returns Promise resolving to the detected language code
 */
export async function detectLanguageFromServer(): Promise<ServerLanguage> {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    
    // Priority 1: Check for user's language preference cookie
    // This represents an explicit user choice, so it always takes precedence
    const languageCookie = cookieStore.get('preferred-language')?.value;
    if (isValidLanguage(languageCookie)) {
      return languageCookie;
    }

    // Priority 2: Check Accept-Language header (only if no saved preference)
    // This is auto-detection, similar to client-side navigator.languages
    const acceptLanguage = headersList.get('accept-language');
    
    if (!acceptLanguage) {
      return 'de'; // Default fallback
    }

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,de;q=0.8")
    // Sort by quality to respect user's language preference order
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.toLowerCase().trim(),
          normalized: normalizeLanguageCode(code),
          quality: qValue ? parseFloat(qValue) : 1.0,
        };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

    // Check for supported languages in order of preference
    // First check full locale match (e.g., 'en-US'), then normalized (e.g., 'en')
    for (const lang of languages) {
      // Check full locale match first
      if (lang.code in LANGUAGE_MAPPING) {
        const detected = LANGUAGE_MAPPING[lang.code];
        if (isValidLanguage(detected)) {
          return detected;
        }
      }
      
      // Check normalized language code
      if (lang.normalized in LANGUAGE_MAPPING) {
        const detected = LANGUAGE_MAPPING[lang.normalized];
        if (isValidLanguage(detected)) {
          return detected;
        }
      }
    }

    // Priority 3: Default fallback to German
    return 'de';
  } catch (error) {
    console.warn('Failed to detect language from server:', error);
    return 'de'; // Safe fallback
  }
}

