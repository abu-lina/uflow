import { en } from './en';
import { de } from './de';

export const LANGUAGES = ['en', 'de', 'ar', 'tr', 'ur', 'ps'] as const;
export type Language = (typeof LANGUAGES)[number];
export type TranslationKeys = typeof en;

// en and de ship in the initial bundle. The gated locales (ar, tr, ur, ps)
// are loaded on demand so their strings stay out of the shared first-load
// chunk that every route pays for.
const loaded: Partial<Record<Language, unknown>> = { en, de };

const loaders = {
  en: async () => en,
  de: async () => de,
  ar: async () => (await import('./ar')).ar,
  tr: async () => (await import('./tr')).tr,
  ur: async () => (await import('./ur')).ur,
  ps: async () => (await import('./ps')).ps,
} satisfies Record<Language, () => Promise<unknown>>;

export function getTranslations(language: Language): unknown {
  return loaded[language];
}

export async function loadTranslations(language: Language): Promise<void> {
  if (loaded[language] === undefined) {
    loaded[language] = await loaders[language]();
  }
}
