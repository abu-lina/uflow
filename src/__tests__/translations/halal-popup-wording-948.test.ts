import { describe, it, expect } from 'vitest';

import { en } from '@/translations/en';
import { de } from '@/translations/de';
import { ar } from '@/translations/ar';
import { tr } from '@/translations/tr';
import { ur } from '@/translations/ur';
import { ps } from '@/translations/ps';

/**
 * #948: halal popup text must not make an unqualified claim that meat
 * "must be slaughtered halal". The popup must only describe what a
 * Review observes and must acknowledge that meat status is the
 * owner's statement unless a certificate exists.
 */

const CATALOGS = { en, de, ar, tr, ur, ps } as const;
type Locale = keyof typeof CATALOGS;

// AC 1 & 2: title and description exist in all six catalogues
describe('halal popup wording (#948)', () => {
  it('providerDetail.halal.title exists as a non-empty string in all six locales', () => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = catalog.providerDetail.halal.title;
      expect(typeof value, `${locale} providerDetail.halal.title`).toBe('string');
      expect((value as string).length, `${locale} providerDetail.halal.title`).toBeGreaterThan(0);
    }
  });

  it('providerDetail.halal.description exists as a non-empty string in all six locales', () => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const value = catalog.providerDetail.halal.description;
      expect(typeof value, `${locale} providerDetail.halal.description`).toBe('string');
      expect(
        (value as string).length,
        `${locale} providerDetail.halal.description`,
      ).toBeGreaterThan(0);
    }
  });

  // AC 2: no locale says the meat "must be slaughtered halal" or equivalent unqualified claim
  it('EN description does not say meat "must be slaughtered halal"', () => {
    expect(en.providerDetail.halal.description).not.toMatch(/must be slaughtered halal/i);
  });

  it('DE description does not say "muss halal geschlachtet sein" or equivalent', () => {
    expect(de.providerDetail.halal.description).not.toMatch(/muss halal geschlachtet/i);
  });

  // AC 1: EN title and description match the approved wording
  it('EN title is "What Ummah Flow checks"', () => {
    expect(en.providerDetail.halal.title).toBe('What Ummah Flow checks');
  });

  it("EN description names what a Review observes and states meat status is the owner's statement unless a certificate exists", () => {
    expect(en.providerDetail.halal.description).toMatch(/owner'?s statement/i);
    expect(en.providerDetail.halal.description).toMatch(/certificate/i);
  });

  // AC 2: DE approved wording
  it('DE title is "Was Ummah Flow prüft"', () => {
    expect(de.providerDetail.halal.title).toBe('Was Ummah Flow prüft');
  });

  it("DE description states meat status is the Betreiber's statement unless a Zertifikat exists", () => {
    expect(de.providerDetail.halal.description).toMatch(/Betreibers/i);
    expect(de.providerDetail.halal.description).toMatch(/Zertifikat/i);
  });

  // AC 3: i18n check passes (covered by npm run i18n:check in verify step;
  // this guards parity of the popup keys across all locales)
  it('all six locales have a non-empty providerDetail.halal.title distinct from the old value', () => {
    const OLD_EN_TITLE = 'Restaurants on Ummah Flow are checked for halal compliance';
    const OLD_DE_TITLE = 'Restaurants auf Ummah Flow werden geprüft, ob sie halal sind';
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      expect(catalog.providerDetail.halal.title, `${locale} should not keep old title`).not.toBe(
        locale === 'de' ? OLD_DE_TITLE : OLD_EN_TITLE,
      );
    }
  });

  it('all six locales have a non-empty providerDetail.halal.description that does not contain the old unqualified claim', () => {
    const FORBIDDEN_PHRASES: Record<Locale, RegExp> = {
      en: /must be slaughtered halal/i,
      de: /muss halal geschlachtet/i,
      ar: /يجب أن يكون اللحم مذبوحًا/,
      tr: /helal usule göre kesilmiş olması gerekir/i,
      ur: /حلال طریقے سے ذبح ہونا ضروری ہے/,
      ps: /باید د حلال طریقې سره ذبح شوې وي/,
    };
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      const desc = catalog.providerDetail.halal.description;
      expect(desc, `${locale} still has the unqualified slaughter claim`).not.toMatch(
        FORBIDDEN_PHRASES[locale as Locale],
      );
    }
  });
});
