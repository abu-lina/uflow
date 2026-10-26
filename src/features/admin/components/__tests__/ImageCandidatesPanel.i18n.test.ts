import { describe, it, expect } from 'vitest';

import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

const KEYS = [
  'title',
  'loading',
  'genericError',
  'alt',
  'approve',
  'reject',
  'approveAria',
  'rejectAria',
  'openImage',
  'source.google_maps_apify',
  'source.unsplash',
];

const get = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

describe('ImageCandidatesPanel translations (#795)', () => {
  it.each([
    ['en', en],
    ['de', de],
    ['ar', ar],
    ['tr', tr],
    ['ur', ur],
    ['ps', ps],
  ])('has every panel key in %s', (_locale, messages) => {
    for (const key of KEYS) {
      const value = get(messages, `editProvider.editImages.candidates.${key}`);
      expect(typeof value, key).toBe('string');
      expect((value as string).length, key).toBeGreaterThan(0);
    }
  });
});
