/**
 * Server-side language detection utilities
 * 
 * This file contains server-only utilities that use next/headers.
 * DO NOT import this file in client components.
 */

import 'server-only';

import { headers, cookies } from 'next/headers';

export type ServerLanguage = 'de' | 'en' | 'ar' | 'tr';

/**
 * Detect language from server-side request (cookies and headers)
 * Used in server components and API routes
 * 
 * @returns Promise resolving to the detected language code
 */
export async function detectLanguageFromServer(): Promise<ServerLanguage> {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    
    // Priority 1: Check for user's language preference cookie
    const languageCookie = cookieStore.get('preferred-language')?.value;
    if (languageCookie && ['de', 'en', 'ar', 'tr'].includes(languageCookie)) {
      return languageCookie as ServerLanguage;
    }

    // Priority 2: Check Accept-Language header
    const acceptLanguage = headersList.get('accept-language');
    
    if (!acceptLanguage) {
      return 'de'; // Default fallback
    }

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,de;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.toLowerCase().split('-')[0], // Extract base language
          quality: qValue ? parseFloat(qValue) : 1.0,
        };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality

    // Check for supported languages in order of preference
    for (const lang of languages) {
      if (lang.code === 'en') return 'en';
      if (lang.code === 'de') return 'de';
      if (lang.code === 'ar') return 'ar';
      if (lang.code === 'tr') return 'tr';
    }

    return 'de'; // Default fallback
  } catch (error) {
    console.warn('Failed to detect language from server:', error);
    return 'de'; // Safe fallback
  }
}

