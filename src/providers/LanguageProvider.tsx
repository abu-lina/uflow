'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, type Language } from '@/translations';

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

// Language detection with fallback
function detectLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'de'; // Default for SSR
  }

  try {
    // Get saved language preference first
    const savedLanguage = localStorage.getItem('preferred-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de' || savedLanguage === 'ar' || savedLanguage === 'tr')) {
      return savedLanguage;
    }

    // Detect from browser languages
    const languages = navigator.languages || [navigator.language];
    
    for (const lang of languages) {
      const normalizedLang = lang.toLowerCase().split('-')[0];
      if (normalizedLang in LANGUAGE_MAPPING) {
        return LANGUAGE_MAPPING[normalizedLang];
      }
    }

    // Fallback to browser language
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
    return browserLang === 'en' ? 'en' : 'de';
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

  // Save language preference to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', lang);
    }
  };

  // Handle language detection after hydration
  useEffect(() => {
    // Detect language using the enhanced detection function
    const detectedLang = detectLanguage();
    setLanguageState(detectedLang);
    
    // Save the detected language if it's not already saved
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('preferred-language');
      if (!savedLanguage) {
        localStorage.setItem('preferred-language', detectedLang);
      }
    }
  }, []);

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(`Translation key "${key}" not found for language "${language}"`);
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