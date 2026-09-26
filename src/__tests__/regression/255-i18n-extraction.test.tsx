/**
 * Plan 255 C6 (#415): i18n extraction + icon/colour standards for the
 * create entry pages.
 *
 * - Every user-visible string on /create, /create/recommend and
 *   /create/halal goes through t(); no hardcoded copy remains.
 * - No @iconify/react import and no mdi:* icon names in those pages.
 * - No hex colour literals in the touched pages.
 * - New keys exist in de/en; ar/tr/ur/ps carry the marked INTERIM German
 *   source pending human translation (see
 *   agent-output/requests/255-i18n-human-review.md).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../..');
const page = (p: string) => fs.readFileSync(path.join(SRC, p), 'utf8');

const PAGES = [
  'app/(public)/create/page.tsx',
  'app/(public)/create/recommend/page.tsx',
  'app/(public)/create/halal/page.tsx',
];

describe('255 C6 — no hardcoded user-visible strings', () => {
  it.each(PAGES)('%s uses no raw German/English copy from the previous baseline', (file) => {
    const src = page(file);
    const literals = [
      'Bezeugst du bei Allah',
      'Verifizierungsmethode',
      'Halal-Zertifikat',
      'Zertifikat hochladen',
      'Wie wurde die Halal-Konformität',
      'Vor Ort besucht',
      'Online überprüft',
      'Quick Import (Beta)',
      'Try Quick Import',
      'Import from Google',
    ];
    for (const lit of literals) {
      expect(src, `${file} still contains "${lit}"`).not.toContain(lit);
    }
  });

  it('halal page strings resolve via t() keys', () => {
    const src = page('app/(public)/create/halal/page.tsx');
    for (const key of [
      'createHalal.stepTitle',
      'createHalal.title',
      'createHalal.attestationIntro',
      'createHalal.verificationTitle',
      'createHalal.verificationDesc',
      'createHalal.methodOnline',
      'createHalal.methodOnlineDesc',
      'createHalal.methodOnsite',
      'createHalal.methodOnsiteDesc',
      'createHalal.certificateTitle',
      'createHalal.certificateDesc',
      'createHalal.certificateUpload',
    ]) {
      expect(src).toContain(`t('${key}')`);
    }
  });

  it('create chooser quick-import strings resolve via t() keys', () => {
    const src = page('app/(public)/create/page.tsx');
    for (const key of [
      'createPage.quickImportTitle',
      'createPage.quickImportDescription',
      'createPage.quickImportButton',
    ]) {
      expect(src).toContain(`t('${key}')`);
    }
  });
});

describe('255 C6 — icon and colour standards', () => {
  it.each(PAGES)('%s has no @iconify import or mdi: icon names', (file) => {
    const src = page(file);
    expect(src).not.toContain('@iconify');
    expect(src).not.toContain('mdi:');
    expect(src).not.toContain('material-symbols:');
  });

  it.each(['app/(public)/create/page.tsx', 'app/(public)/create/halal/page.tsx'])(
    '%s has no hex colour literals',
    (file) => {
      const src = page(file);
      expect(src).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    },
  );

  it('halal page uses lucide-react icons with w-icon-*/h-icon-* tokens', () => {
    const src = page('app/(public)/create/halal/page.tsx');
    expect(src).toContain("from 'lucide-react'");
    expect(src).toMatch(/[wh]-icon-(xs|sm|md|lg|xl)/);
  });
});

describe('255 C6 — locale coverage', () => {
  const NEW_KEYS = [
    'createPage.quickImportTitle',
    'createPage.quickImportDescription',
    'createPage.quickImportButton',
    'createHalal.stepTitle',
    'createHalal.attestationIntro',
    'createHalal.certificateUpload',
    'submissionStatus.awaitingReview',
    'submissionStatus.pendingBadge',
    'submissionStatus.provisionalSeal',
    'submissionStatus.submittedToast',
    'submissionValidation.fieldRequired',
  ];

  const leafKey = (key: string) => key.slice(key.lastIndexOf('.') + 1);

  it.each(['de', 'en'])('%s.ts contains every new key', (locale) => {
    const src = page(`translations/${locale}.ts`);
    for (const key of NEW_KEYS) {
      expect(src).toContain(`${leafKey(key)}:`);
    }
  });

  it.each(['ar', 'tr', 'ur', 'ps'])(
    '%s.ts carries marked INTERIM German pending human translation',
    (locale) => {
      const src = page(`translations/${locale}.ts`);
      expect(src).toContain('INTERIM');
      expect(src).toContain('attestationIntro:');
      expect(src).toContain('pendingReview:');
      // German source text seeded, not machine-translated target language.
      expect(src).toContain('Bezeugst du bei Allah');
    },
  );
});
