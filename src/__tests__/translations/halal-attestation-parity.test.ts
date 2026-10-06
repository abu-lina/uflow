import { describe, it, expect } from 'vitest';

import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

/**
 * #548: parity for every catalogue key this issue touches.
 *
 * - The nine attestation keys, the two group headers, the four rewritten
 *   auto* verdict strings and the new adminHalalEdit.review.* keys exist in
 *   all six catalogues with no orphan.
 * - No ar/tr/ur/ps value may hold German source text (AC 14, 15). Proxied by
 *   "not identical to the de value" — a real translation is never byte-equal
 *   to German for these phrases.
 */

const CATALOGS = { en, de, ar, tr, ur, ps } as const;
const GATED = ['ar', 'tr', 'ur', 'ps'] as const;

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const ATTESTATION_KEYS = [
  'halal.attestation.sectionTitle',
  'halal.attestation.recommendDescription',
  'halal.attestation.noAlcohol.label',
  'halal.attestation.noAlcohol.desc',
  'halal.attestation.noPork.label',
  'halal.attestation.noPork.desc',
  'halal.attestation.noGambling.label',
  'halal.attestation.noGambling.desc',
  'halal.attestation.answer.yes',
  'halal.attestation.answer.no',
  'halal.attestation.answer.notSure',
];

const GROUP_KEYS = ['halal.admin.declaredNonCompliant', 'halal.admin.unanswered'];

const VERDICT_KEYS = [
  'adminHalalEdit.autoApprovedTitle',
  'adminHalalEdit.autoApprovedDesc',
  'adminHalalEdit.autoRejectedTitle',
  'adminHalalEdit.autoRejectedDesc',
];

const REVIEW_KEYS = [
  'adminHalalEdit.review.approve',
  'adminHalalEdit.review.reject',
  'adminHalalEdit.review.approved',
  'adminHalalEdit.review.rejected',
  'adminHalalEdit.review.gateBlocked',
  'adminHalalEdit.review.conflict',
  'adminHalalEdit.review.decidedNotice',
  'adminHalalEdit.review.status.rejected',
  'adminHalalEdit.review.status.removedByOwner',
];

const ALL_KEYS = [...ATTESTATION_KEYS, ...GROUP_KEYS, ...VERDICT_KEYS, ...REVIEW_KEYS];

describe('halal attestation parity (#548)', () => {
  it.each(ALL_KEYS)('%s exists as a non-empty string in all six catalogues', (key) => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = getPath(catalog, key);
      expect(typeof value, `${locale} ${key}`).toBe('string');
      expect((value as string).length, `${locale} ${key}`).toBeGreaterThan(0);
    }
  });

  it.each(ALL_KEYS)('%s does not hold German source text in ar/tr/ur/ps', (key) => {
    const deValue = getPath(de, key);
    for (const locale of GATED) {
      const value = getPath(CATALOGS[locale], key);
      expect(value, `${locale} ${key} equals de`).not.toBe(deValue);
    }
  });

  it('no catalogue carries an orphan key under halal.attestation', () => {
    const enBlock = en.halal.attestation;
    for (const locale of Object.keys(CATALOGS)) {
      const block = getPath(
        CATALOGS[locale as keyof typeof CATALOGS],
        'halal.attestation',
      ) as Record<string, unknown>;
      expect(Object.keys(block).sort()).toEqual(Object.keys(enBlock).sort());
      for (const sub of Object.keys(enBlock)) {
        const enSub = enBlock[sub as keyof typeof enBlock];
        if (enSub && typeof enSub === 'object') {
          expect(
            Object.keys(block[sub] as Record<string, unknown>).sort(),
            `${locale} halal.attestation.${sub}`,
          ).toEqual(Object.keys(enSub as Record<string, unknown>).sort());
        }
      }
    }
  });

  it('the rewritten de labels ask affirmatively, without the old negation', () => {
    // AC 14/15 root cause: "Wird kein Alkohol … angeboten?" answered with
    // "Ja" was a triple negation. The new labels keep no negated phrasing.
    expect(de.halal.attestation.noAlcohol.desc).not.toMatch(/kein/i);
    expect(de.halal.attestation.noPork.desc).not.toMatch(/kein/i);
    expect(de.halal.attestation.noGambling.desc).not.toMatch(/kein/i);
    expect(de.adminHalalEdit.autoRejectedDesc).not.toMatch(/Bearbeitungsseite/);
    expect(en.adminHalalEdit.autoRejectedDesc).not.toMatch(/edit page/i);
  });
});
