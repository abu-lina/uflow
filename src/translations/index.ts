import { en } from './en';
import { de } from './de';
import { ar } from './ar';
import { tr } from './tr';
import { ur } from './ur';
import { ps } from './ps';

export const translations = {
  en,
  de,
  ar,
  tr,
  ur,
  ps,
} as const;

export type Language = keyof typeof translations;
export type TranslationKeys = typeof en;

