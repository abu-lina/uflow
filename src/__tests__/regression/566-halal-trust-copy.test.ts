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
 * - de: the heading keeps the comma before "ob" and the body uses the
 *   accusative "keinen Alkohol" — both approved in the Diagnose phase.
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

  it('de description terminates the participle clause with its auxiliary verb', () => {
    // The reported symptom: "Das Fleisch muss halal geschlachtet." ends the
    // sentence on a bare participle. Asserting /geschlachtet sein\.$/ keeps
    // the test meaningful if the copy is reworded later — it pins the
    // grammar defect, not the exact string.
    const description = String(getPath(de, 'providerDetail.halal.description')).trim();
    expect(description).toMatch(/geschlachtet sein\.$/);
    expect(description).not.toMatch(/geschlachtet\.$/);
  });

  it('de heading separates the "ob" subordinate clause with a comma', () => {
    const title = String(getPath(de, 'providerDetail.halal.title'));
    expect(title).toContain('geprüft, ob');
    expect(title).not.toContain('geprüft ob');
  });

  it('de description uses the accusative "keinen Alkohol" after "anbietet"', () => {
    const description = String(getPath(de, 'providerDetail.halal.description'));
    expect(description).toContain('keinen Alkohol');
    expect(description).not.toContain('kein Alkohol');
  });
});
