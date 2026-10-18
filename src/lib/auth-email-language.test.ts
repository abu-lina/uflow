import { describe, it, expect } from 'vitest';
import { LANGUAGES } from '@/translations';
import {
  AUTH_EMAIL_LANGUAGES,
  isAuthEmailLanguage,
  toAuthEmailLanguage,
} from '@/lib/auth-email-language';

describe('auth email language helper (#722 AC1)', () => {
  it.each(['en', 'de', 'ar', 'tr'])('%s passes through unchanged', (lang) => {
    expect(toAuthEmailLanguage(lang)).toBe(lang);
    expect(isAuthEmailLanguage(lang)).toBe(true);
  });

  it.each(['ur', 'ps'])('%s maps to en', (lang) => {
    expect(toAuthEmailLanguage(lang)).toBe('en');
    expect(isAuthEmailLanguage(lang)).toBe(false);
  });

  it('covers every UI locale', () => {
    for (const lang of LANGUAGES) {
      expect(AUTH_EMAIL_LANGUAGES).toContain(toAuthEmailLanguage(lang));
    }
  });

  it('maps unknown or missing values to en', () => {
    expect(toAuthEmailLanguage('fr')).toBe('en');
    expect(toAuthEmailLanguage(undefined)).toBe('en');
    expect(toAuthEmailLanguage(null)).toBe('en');
  });
});
