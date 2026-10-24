import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

const locales = { en, de, ar, tr, ur, ps } as const;
const NEW_KEYS = ['successTitle', 'spamHint'] as const;

describe('signup.checkEmail strings (issue #743 AC5)', () => {
  for (const [code, bundle] of Object.entries(locales)) {
    it(`has the inbox, confirm and spam strings in ${code}`, () => {
      const checkEmail = bundle.signup.checkEmail as Record<string, string>;
      for (const key of NEW_KEYS) {
        expect(typeof checkEmail[key]).toBe('string');
        expect(checkEmail[key].trim().length).toBeGreaterThan(0);
      }
    });
  }
});
