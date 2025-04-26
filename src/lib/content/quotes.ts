/**
 * Quotes
 * 
 * Collection of inspirational quotes used throughout the application.
 * Organized by language and category for better maintainability.
 */

import { Quote } from './types';

// Configuration
export const QUOTES_CONFIG = {
  defaultLanguage: 'de',
  supportedLanguages: ['de', 'en', 'ar'],
  updateFrequency: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Quotes by language
export const QUOTES: Record<string, Quote[]> = {
  de: [
    {
      text: "Wer auch immer eine gute Tat vollbringt, dem werden wir noch mehr Gutes hinzufügen.",
      author: "Koran, Sure 42, Vers 23",
      category: "islamic",
      language: "de"
    },
    {
      text: "Die beste Spende ist die, die man gibt, während man selbst bedürftig ist.",
      author: "Hadith",
      category: "islamic",
      language: "de"
    },
    {
      text: "Keiner von euch ist gläubig, bis er für seinen Bruder wünscht, was er für sich selbst wünscht.",
      author: "Hadith, Bukhari & Muslim",
      category: "islamic",
      language: "de"
    }
  ],
  en: [
    {
      text: "Whoever does a good deed, We will increase it in goodness.",
      author: "Quran, Surah 42, Verse 23",
      category: "islamic",
      language: "en"
    }
  ],
  ar: [
    {
      text: "من عمل صالحا فلنفسه ومن أساء فعليها",
      author: "القرآن الكريم، سورة فصلت، الآية 46",
      category: "islamic",
      language: "ar"
    }
  ]
};

// Helper functions
export function getQuotesByLanguage(language: string = QUOTES_CONFIG.defaultLanguage): Quote[] {
  return QUOTES[language] || QUOTES[QUOTES_CONFIG.defaultLanguage];
}

export function getQuotesByCategory(category: string, language?: string): Quote[] {
  const quotes = getQuotesByLanguage(language);
  return quotes.filter(quote => quote.category === category);
} 