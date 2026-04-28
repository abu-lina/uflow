import { describe, expect, it } from 'vitest';

import { collectMissingKeys } from '../../scripts/check-i18n.mjs';

describe('check-i18n script utilities', () => {
  it('detects missing keys against en as canonical locale', () => {
    const locales = {
      en: {
        common: {
          hello: 'Hello',
          nested: { one: 'One' },
        },
      },
      de: {
        common: {
          hello: 'Hallo',
        },
      },
    };

    const result = collectMissingKeys(locales as never, 'en') as Record<string, string[]>;

    expect(result.de).toEqual(['common.nested.one']);
  });
});
