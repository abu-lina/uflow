'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { getTranslations, loadTranslations, LANGUAGES, type Language } from '@/translations';

// Supported languages mapping
const LANGUAGE_MAPPING: Record<string, Language> = {
  en: 'en',
  de: 'de',
  ar: 'ar',
  tr: 'tr',
  ur: 'ur',
  ps: 'ps',
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
  // Add more mappings as needed
};

// Valid language codes
const VALID_LANGUAGES: readonly Language[] = LANGUAGES;

// Locales whose document direction is RTL.
const RTL_LANGUAGES: readonly Language[] = ['ar', 'ur', 'ps'];

// U+2066 FIRST STRONG ISOLATE … U+2069 POP DIRECTIONAL ISOLATE.
const FSI = '\u2066';
const PDI = '\u2069';

// Check if a language code is valid
function isValidLanguage(lang: string | null): lang is Language {
  return lang !== null && VALID_LANGUAGES.includes(lang as Language);
}

// Normalize language code (e.g., 'en-US' -> 'en', 'de-DE' -> 'de')
function normalizeLanguageCode(lang: string): string {
  return lang.toLowerCase().split('-')[0].trim();
}

// Language detection with improved reliability
function detectLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'de'; // Default for SSR
  }

  try {
    // Priority 1: Check saved user preference (highest priority)
    // This represents an explicit user choice, so it always takes precedence
    const savedLanguage = localStorage.getItem('preferred-language');
    if (isValidLanguage(savedLanguage)) {
      return savedLanguage;
    }

    // Priority 2: Auto-detect from browser languages (only if no saved preference)
    // Check navigator.languages array (user's language preference list)
    const browserLanguages = navigator.languages || [];

    // Also include navigator.language as fallback if languages array is empty
    const allLanguages =
      browserLanguages.length > 0
        ? browserLanguages
        : navigator.language
          ? [navigator.language]
          : [];

    // Check each language in order of preference
    for (const lang of allLanguages) {
      const normalized = normalizeLanguageCode(lang);

      // Check direct match first (e.g., 'en' -> 'en')
      if (normalized in LANGUAGE_MAPPING) {
        const detected = LANGUAGE_MAPPING[normalized];
        if (isValidLanguage(detected)) {
          return detected;
        }
      }

      // Check full locale match (e.g., 'en-US' -> 'en')
      const fullLang = lang.toLowerCase();
      if (fullLang in LANGUAGE_MAPPING) {
        const detected = LANGUAGE_MAPPING[fullLang];
        if (isValidLanguage(detected)) {
          return detected;
        }
      }
    }

    // Priority 3: Fallback to default (German)
    return 'de';
  } catch (error) {
    console.warn('Error detecting language:', error);
    return 'de'; // Safe fallback
  }
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('de'); // Always start with German to prevent hydration issues
  const [bundleTick, setBundleTick] = useState(0);

  // The gated locales load on demand; until the bundle arrives t() falls back
  // to the eagerly-bundled 'de' strings.
  useEffect(() => {
    if (getTranslations(language) !== undefined) {
      return;
    }
    let active = true;
    loadTranslations(language)
      .then(() => {
        if (active) {
          setBundleTick((v) => v + 1);
        }
      })
      .catch((error) => {
        console.warn(`Failed to load "${language}" translations:`, error);
      });
    return () => {
      active = false;
    };
  }, [language]);

  // Save language preference to localStorage only
  // This represents an explicit user choice, so it will always take precedence over auto-detection
  // Note: We use localStorage only (no cookies) to avoid requiring cookie consent under GDPR
  const setLanguage = useCallback((lang: Language) => {
    if (!isValidLanguage(lang)) {
      console.warn(`Invalid language code: ${lang}. Falling back to 'de'.`);
      lang = 'de';
    }

    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      // Save to localStorage for client-side persistence
      // This marks it as a user-selected preference (not auto-detected)
      localStorage.setItem('preferred-language', lang);
    }
  }, []);

  // Handle language detection after hydration
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Priority 1: Check for saved user preference (explicit user choice)
    const savedLanguage = localStorage.getItem('preferred-language');

    if (isValidLanguage(savedLanguage)) {
      // User has explicitly selected a language - use it
      setLanguageState(savedLanguage);
      return;
    }

    // Priority 2: Auto-detect language (only if no saved preference exists)
    // This only happens on first visit or if preference was cleared
    const detectedLang = detectLanguage();
    setLanguageState(detectedLang);

    // Save the auto-detected language as initial preference
    // This allows it to persist across sessions, but user can still override it
    localStorage.setItem('preferred-language', detectedLang);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Translation function - memoized to prevent recreation on every render
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: unknown = getTranslations(language) ?? getTranslations('de');

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Translation key "${key}" not found for language "${language}"`);
          }
          return key;
        }
      }

      let result = typeof value === 'string' ? value : key;

      // Replace variables in the format {{variableName}}
      if (variables) {
        // #548: in RTL locales, interpolated values (Latin-script provider
        // names, numbers, URLs) are wrapped in Unicode bidi isolation.
        // Without it, a weak-direction value inside an RTL sentence lets
        // surrounding punctuation reorder — the trailing '.' rendered at
        // the start of the line on the halal check page. FSI/PDI are
        // invisible format characters; LTR output stays byte-identical so
        // existing text and aria-label assertions are untouched.
        const isolate = RTL_LANGUAGES.includes(language);
        for (const [varName, varValue] of Object.entries(variables)) {
          const text = isolate ? `${FSI}${String(varValue)}${PDI}` : String(varValue);
          // Function replacer: a literal '$' in the value must not be
          // treated as a replacement pattern.
          result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), () => text);
        }
      }

      return result;
    },
    // bundleTick re-creates t when a lazy translation bundle finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, bundleTick],
  );

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
