import { describe, it, expect } from 'vitest';

import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

/**
 * #548: parity for every catalogue key the halal check admin page renders.
 *
 * - The nine attestation keys, the two group headers, the four rewritten
 *   auto* verdict strings, the adminHalalEdit.review.* keys and every
 *   createHalal/adminHalalEdit/common key the page can paint (including
 *   both modals and the toast/error states) exist in all six catalogues.
 * - No ar/tr/ur/ps value may hold untranslated source text (AC 14, 15).
 *   Proxied by "not identical to the de/en value" — a real translation of
 *   these phrases is never byte-equal to German or English. That gate is
 *   what would have caught the half-German ar page: every key existed, so
 *   the old key-existence parity passed.
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
  // ApproveModal (#548 design fixes): the confirmation copy names the
  // consequence in every catalogue, never German source text.
  'adminHalalEdit.review.approveConfirm.title',
  'adminHalalEdit.review.approveConfirm.body',
  'adminHalalEdit.review.approveConfirm.confirm',
  'adminHalalEdit.review.approveConfirm.confirming',
  // RejectModal (#548 locale fix): its copy was hardcoded English, which
  // leaked onto every locale. Now keyed like ApproveModal.
  'adminHalalEdit.review.rejectConfirm.title',
  'adminHalalEdit.review.rejectConfirm.body',
  'adminHalalEdit.review.rejectConfirm.reasonLabel',
  'adminHalalEdit.review.rejectConfirm.reasonPlaceholder',
  'adminHalalEdit.review.rejectConfirm.confirm',
  'adminHalalEdit.review.rejectConfirm.confirming',
  // Evidence rework: the footer names a failed meta fetch in every locale.
  'adminHalalEdit.review.loadFailed',
  // #562 Code Review 2: a 401/403 needs a different instruction than a
  // network failure — reload cannot fix an expired session.
  'adminHalalEdit.review.loadFailedAuth',
];

/**
 * #548 locale fix: every remaining string the halal check admin page
 * renders — section headings, verification-method radios, certificate
 * section, derived-tier explainer, warning banner, toasts and footer
 * labels. These were the "Plan 255 INTERIM" German strings that the
 * attestation-only key set missed: the keys existed, so parity passed
 * while the ar page rendered a half-German surface.
 */
const PAGE_KEYS = [
  'common.save',
  'common.cancel',
  'common.close',
  'adminHalalEdit.title',
  'adminHalalEdit.uploading',
  'adminHalalEdit.attestationWarning',
  'adminHalalEdit.existingCertificate',
  'adminHalalEdit.viewCertificate',
  'adminHalalEdit.derivedTierInfo',
  'adminHalalEdit.derivedTierLabel',
  'adminHalalEdit.tier.gold',
  'adminHalalEdit.tier.silver',
  'adminHalalEdit.tier.bronze',
  'createHalal.verificationTitle',
  'createHalal.verificationDesc',
  'createHalal.methodOnline',
  'createHalal.methodOnlineDesc',
  'createHalal.methodOnsite',
  'createHalal.methodOnsiteDesc',
  'createHalal.certificateTitle',
  'createHalal.certificateDesc',
  'createHalal.certificateUpload',
  'createHalal.certificateInvalidType',
  'createHalal.certificateTooLarge',
];

const ALL_KEYS = [
  ...ATTESTATION_KEYS,
  ...GROUP_KEYS,
  ...VERDICT_KEYS,
  ...REVIEW_KEYS,
  ...PAGE_KEYS,
];

describe('halal attestation parity (#548)', () => {
  it.each(ALL_KEYS)('%s exists as a non-empty string in all six catalogues', (key) => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = getPath(catalog, key);
      expect(typeof value, `${locale} ${key}`).toBe('string');
      expect((value as string).length, `${locale} ${key}`).toBeGreaterThan(0);
    }
  });

  it.each(ALL_KEYS)('%s does not hold German or English source text in ar/tr/ur/ps', (key) => {
    const deValue = getPath(de, key);
    const enValue = getPath(en, key);
    for (const locale of GATED) {
      const value = getPath(CATALOGS[locale], key);
      expect(value, `${locale} ${key} equals de`).not.toBe(deValue);
      expect(value, `${locale} ${key} equals en`).not.toBe(enValue);
    }
  });

  // Interpolated placeholders are part of the contract: a catalogue that
  // drops {{name}}/{{status}} silently renders the raw token or a broken
  // sentence, and the bidi isolation in t() keys off the {{}} syntax.
  const INTERPOLATED_KEYS: Array<[string, string]> = [
    ['adminHalalEdit.review.decidedNotice', '{{status}}'],
    ['adminHalalEdit.review.approveConfirm.body', '{{name}}'],
    ['adminHalalEdit.review.rejectConfirm.body', '{{name}}'],
  ];

  it.each(INTERPOLATED_KEYS)(
    '%s keeps the %s placeholder in all six catalogues',
    (key, placeholder) => {
      for (const [locale, catalog] of Object.entries(CATALOGS)) {
        const value = getPath(catalog, key);
        expect(String(value), `${locale} ${key}`).toContain(placeholder);
      }
    },
  );

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
