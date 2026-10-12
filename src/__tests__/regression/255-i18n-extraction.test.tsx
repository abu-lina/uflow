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

// Components the create/recommend surfaces render — standards apply here
// too, not just on the page files (S1/S2). The shared Icon wrapper
// (components/ui/Icon) and StepIndicator internals are intentionally out of
// scope for this migration.
const COMPONENTS = [
  'components/shared/HalalAttestationFields.tsx',
  'components/shared/VerificationMethodField.tsx',
  'components/shared/RecommendSuccessScreen.tsx',
  'components/shared/LoginGate.tsx',
  'features/providers/StreamlinedRecommendForm.tsx',
  'features/providers/StreamlinedImportForm.tsx',
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
  it.each([...PAGES, ...COMPONENTS])('%s has no @iconify import or mdi: icon names', (file) => {
    const src = page(file);
    expect(src).not.toContain('@iconify');
    expect(src).not.toContain('mdi:');
    expect(src).not.toContain('material-symbols:');
  });

  // Issue references (#415, #606) live in comments; strip comments before
  // the hex check instead of stripping digit patterns — a real all-digit
  // hex colour (#000, #333, #666666) must still be caught.
  const stripComments = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, '') // block + JSX {/* */} comments
      .replace(/(^|[^:'"`])\/\/[^\n]*/gm, '$1'); // line comments ('//' after : or quotes is a URL/string)

  const hasHexLiteral = (src: string) => /#[0-9A-Fa-f]{3,8}\b/.test(stripComments(src));

  it.each(['app/(public)/create/page.tsx', 'app/(public)/create/halal/page.tsx', ...COMPONENTS])(
    '%s has no hex colour literals',
    (file) => {
      expect(hasHexLiteral(page(file))).toBe(false);
    },
  );

  it('the hex gate still catches all-digit colours while ignoring issue refs', () => {
    // #606 in a comment is an issue ref — stripped. #333 in code is a real
    // hex colour — caught. A widened /#\d{3,}/ strip would delete both.
    expect(hasHexLiteral("const c = '#333'; // fixes #606")).toBe(true);
    expect(hasHexLiteral('className="bg-[#333]" {/* ref #606 */}')).toBe(true);
    expect(hasHexLiteral('// issue #606\n/* also #415 */')).toBe(false);
  });

  it('halal page uses lucide-react icons with w-icon-*/h-icon-* tokens', () => {
    const src = page('app/(public)/create/halal/page.tsx');
    expect(src).toContain("from 'lucide-react'");
    expect(src).toMatch(/[wh]-icon-(xs|sm|md|lg|xl)/);
  });

  it.each([
    'components/shared/RecommendSuccessScreen.tsx',
    'features/providers/StreamlinedRecommendForm.tsx',
    'features/providers/StreamlinedImportForm.tsx',
  ])('%s uses lucide-react icons with w-icon-*/h-icon-* tokens', (file) => {
    const src = page(file);
    expect(src).toContain("from 'lucide-react'");
    expect(src).toMatch(/[wh]-icon-(xs|sm|md|lg|xl|2xl|3xl)/);
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
