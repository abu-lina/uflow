'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, type Language } from '@/translations';
import { setCookie } from '@/utils/cookieUtils';

// Supported languages mapping
const LANGUAGE_MAPPING: Record<string, Language> = {
  'en': 'en',
  'de': 'de',
  'ar': 'ar',
  'tr': 'tr',
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
  // Add more mappings as needed
};

// Valid language codes
const VALID_LANGUAGES: Language[] = ['en', 'de', 'ar', 'tr'];

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
    const allLanguages = browserLanguages.length > 0 
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
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('de'); // Always start with German to prevent hydration issues

  // Save language preference to localStorage and cookie
  // This represents an explicit user choice, so it will always take precedence over auto-detection
  const setLanguage = (lang: Language) => {
    if (!isValidLanguage(lang)) {
      console.warn(`Invalid language code: ${lang}. Falling back to 'de'.`);
      lang = 'de';
    }
    
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      // Save to localStorage for client-side persistence
      // This marks it as a user-selected preference (not auto-detected)
      localStorage.setItem('preferred-language', lang);
      // Set cookie so server can read it on next request
      setCookie('preferred-language', lang, {
        maxAge: 365, // 1 year
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // Secure in production (HTTPS only)
      });
    }
  };

  // Handle language detection after hydration
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Priority 1: Check for saved user preference (explicit user choice)
    const savedLanguage = localStorage.getItem('preferred-language');
    
    if (isValidLanguage(savedLanguage)) {
      // User has explicitly selected a language - use it and sync cookie
      setLanguageState(savedLanguage);
      setCookie('preferred-language', savedLanguage, {
        maxAge: 365,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return;
    }

    // Priority 2: Auto-detect language (only if no saved preference exists)
    // This only happens on first visit or if preference was cleared
    const detectedLang = detectLanguage();
    setLanguageState(detectedLang);
    
    // Save the auto-detected language as initial preference
    // This allows it to persist across sessions, but user can still override it
    localStorage.setItem('preferred-language', detectedLang);
    setCookie('preferred-language', detectedLang, {
      maxAge: 365, // 1 year
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }, []);

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

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

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}