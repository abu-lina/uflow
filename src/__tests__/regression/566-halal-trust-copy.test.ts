import { describe, it, expect } from 'vitest';

import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

/**
 * #566: the halal-verification modal ("Restaurants auf Ummah Flow werden
 * geprüft …") showed a body paragraph whose last sentence ends mid-clause:
 * "Das Fleisch muss halal geschlachtet." — a German participle clause needs
 * its auxiliary ("sein"). The user saw it as a cut-off sentence on mobile.
 *
 * Root cause was pure catalogue data, not layout: the rendered <p> has no
 * line-clamp and no height cap, and the dialog is auto-height. The string
 * was authored incomplete in PR #190. So the seam is the catalogue itself:
 * `HalalTrustPopup` -> `HalalTrustBanner` reads
 * `providerDetail.halal.title` / `.description` verbatim via t().
 *
 * Regression coverage:
 * - de: the description terminates the participle clause with its auxiliary
 *   verb (the reported symptom), not just string-equality to the new copy.
 * - de: the heading keeps the comma before "ob", spells the adjectival
 *   "halal" lowercase per Duden, and the body uses the accusative
 *   "keinen Alkohol" — all approved in the Diagnose phase / review.
 * - all six catalogues: the same keys exist as non-empty strings and end in
 *   sentence-terminating punctuation, so no locale can ship a truncated
 *   clause again.
 */

const CATALOGS = { en, de, ar, tr, ur, ps } as const;

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const HALAL_KEYS = ['providerDetail.halal.title', 'providerDetail.halal.description'] as const;

describe('halal trust modal copy (#566)', () => {
  it.each(HALAL_KEYS)('%s is a non-empty string in all six catalogues', (key) => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = getPath(catalog, key);
      expect(typeof value, `${locale} ${key}`).toBe('string');
      expect((value as string).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
    }
  });

  // Only the description is gated on terminal punctuation: the title is a
  // heading and carries none in any of the six catalogues.
  it('providerDetail.halal.description ends in sentence-terminating punctuation in all six catalogues', () => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = String(getPath(catalog, 'providerDetail.halal.description')).trim();
      // Arabic/Urdu/Pashto end with their own full stop; Latin scripts with
      // . ! ? — a truncated clause ends with neither.
      expect(value, `${locale} providerDetail.halal.description`).toMatch(/[.!?؟۔]$/);
    }
  });

  // #948 rewrote the halal popup copy entirely — the four DE-specific grammar
  // assertions below (participle clause, ob-comma, halal-casing, accusative)
  // are superseded by halal-popup-wording-948.test.ts.
});
