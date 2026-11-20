import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en';
import { de } from '@/translations/de';

describe('#953 deliveryOnly translation key present in all locales', () => {
  it('exists in en', () => {
    expect(en.providers.deliveryOnly).toBeDefined();
    expect(typeof en.providers.deliveryOnly).toBe('string');
  });

  it('exists in de', () => {
    expect(de.providers.deliveryOnly).toBeDefined();
    expect(typeof de.providers.deliveryOnly).toBe('string');
  });

  it('exists in ar, tr, ur, ps (lazy-loaded locales export a providers.deliveryOnly key)', async () => {
    const { ar } = await import('@/translations/ar');
    const { tr } = await import('@/translations/tr');
    const { ur } = await import('@/translations/ur');
    const { ps } = await import('@/translations/ps');
    for (const [lang, t] of [
      ['ar', ar],
      ['tr', tr],
      ['ur', ur],
      ['ps', ps],
    ] as const) {
      expect(t.providers.deliveryOnly, `${lang} missing providers.deliveryOnly`).toBeDefined();
    }
  });
});
