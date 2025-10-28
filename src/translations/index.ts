import { en } from './en';
import { de } from './de';
import { ar } from './ar';
import { tr } from './tr';

export const translations = {
  en,
  de,
  ar,
  tr,
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof en;

