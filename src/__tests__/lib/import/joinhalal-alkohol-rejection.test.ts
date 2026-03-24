/**
 * Regression tests for the JoinHalal Alkoholverkauf auto-rejection rule (Plan 051).
 *
 * These tests verify that transformPage() — the shared transformation function
 * in src/lib/import/joinhalal.ts — correctly maps the Alkoholverkauf Halal
 * Merkmale marker to review_status = 'rejected' at import time.
 *
 * TDD: Written before implementation (Red → Green).
 * Red-phase failure: "Export 'transformPage' doesn't exist in '@/lib/import/joinhalal'"
 */

import { describe, it, expect } from 'vitest';
import { transformPage, IMPORT_BOT_UUID } from '@/lib/import/joinhalal';
import type { Category, Offer } from '@/lib/import/joinhalal';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal category list to resolve the restaurant slug */
const CATEGORIES: Category[] = [
  { category_id: 'cat-001', name_de: 'Restaurant' },
];

/** Empty offers list (offers are not part of the rejection rule) */
const OFFERS: Offer[] = [];

const TEST_URL = 'https://joinhalal.com/locations/restaurant/test-restaurant/';

/**
 * Builds a minimal JoinHalal HTML page with Schema.org ld+json containing
 * the given Halal Merkmale value string.
 */
function makeHtmlWithHalalMerkmale(halalMerkmale: string | null): string {
  const additionalProperty =
    halalMerkmale !== null
      ? `,"additionalProperty":[{"@type":"PropertyValue","name":"Halal Merkmale","value":"${halalMerkmale}"}]`
      : '';

  return `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">
{
  "@context":"https://schema.org",
  "@graph":[{
    "@type":"FoodEstablishment",
    "name":"Test Restaurant",
    "url":"${TEST_URL}",
    "address":{"@type":"PostalAddress","streetAddress":"Teststr. 1, 12345 Berlin","addressCountry":"DE"}
    ${additionalProperty}
  }]
}
</script>
</head><body><h1 class="page-title">Test Restaurant</h1></body></html>`;
}

/** HTML with no additionalProperty at all */
const HTML_NO_ADDITIONAL_PROPERTY = makeHtmlWithHalalMerkmale(null);

/** HTML with Alkoholverkauf in Halal Merkmale */
const HTML_ALKOHOLVERKAUF = makeHtmlWithHalalMerkmale('Handgeschächtet, Alkoholverkauf, Lieferung');

/** HTML with non-Alkoholverkauf Halal Merkmale */
const HTML_NO_ALKOHOL = makeHtmlWithHalalMerkmale('Handgeschächtet, Lieferung');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Asserts that `value` is non-null/undefined and returns it with narrowed type.
 * Avoids ESLint no-non-null-assertion warnings in tests.
 */
function expectRecord(
  result: ReturnType<typeof transformPage>
): NonNullable<ReturnType<typeof transformPage>['record']> {
  expect(result.record).not.toBeNull();
  if (!result.record) throw new Error('record is null');
  return result.record;
}

// ---------------------------------------------------------------------------
// transformPage — review_status decision branch (Plan 051)
// ---------------------------------------------------------------------------

describe('transformPage — Alkoholverkauf auto-rejection (Plan 051)', () => {
  it('[post-fix PASSES] sets review_status to rejected when Halal Merkmale contains Alkoholverkauf', () => {
    const record = expectRecord(transformPage(HTML_ALKOHOLVERKAUF, TEST_URL, CATEGORIES, false, OFFERS));
    expect(record.review_status).toBe('rejected');
  });

  it('[post-fix PASSES] keeps review_status as pending when Halal Merkmale lacks Alkoholverkauf', () => {
    const record = expectRecord(transformPage(HTML_NO_ALKOHOL, TEST_URL, CATEGORIES, false, OFFERS));
    expect(record.review_status).toBe('pending');
  });

  it('[post-fix PASSES] keeps review_status as pending when no additionalProperty is present', () => {
    const record = expectRecord(transformPage(HTML_NO_ADDITIONAL_PROPERTY, TEST_URL, CATEGORIES, false, OFFERS));
    expect(record.review_status).toBe('pending');
  });

  it('[post-fix PASSES] preserves import-bot provenance on auto-rejected records', () => {
    const record = expectRecord(transformPage(HTML_ALKOHOLVERKAUF, TEST_URL, CATEGORIES, false, OFFERS));
    expect(record.user_created_id).toBe(IMPORT_BOT_UUID);
  });
});

// ---------------------------------------------------------------------------
// transformPage — HTML badge fallback (Plan 057)
// ---------------------------------------------------------------------------

/**
 * Builds a JoinHalal page where JSON-LD has Halal-Merkmale with non-alcohol
 * value (e.g. "Asiatisch") but the visible HTML badges contain the given
 * badge texts. Simulates the real-world Dakju/Triple B pattern.
 */
function makeHtmlWithBadgeFallback(
  jsonLdValue: string | null,
  badgeTexts: string[]
): string {
  const additionalProperty = jsonLdValue !== null
    ? `,"additionalProperty":[{"@type":"PropertyValue","name":"Halal-Merkmale","value":"${jsonLdValue}"}]`
    : '';

  const badgeListItems = badgeTexts.map(
    (text) => `<li class="flexify ts-action"><div class="ts-action-con"><div class="ts-action-icon"><i class="lar la-check-circle"></i></div>${text}</div></li>`
  ).join('\n');

  const badgeSection = badgeTexts.length > 0
    ? `<div><h3 class="elementor-heading-title elementor-size-default">Halal Merkmale</h3></div>
       <div class="elementor-widget elementor-widget-ts-advanced-list">
         <ul class="flexify simplify-ul ts-advanced-list">${badgeListItems}</ul>
       </div>`
    : '';

  return `<!DOCTYPE html><html><head>
<script type="application/ld+json" class="rank-math-schema-pro">
{
  "@context":"https://schema.org",
  "@graph":[{
    "@type":"FoodEstablishment",
    "name":"Test Fallback Restaurant",
    "url":"${TEST_URL}",
    "address":{"@type":"PostalAddress","streetAddress":"Teststr. 1, 12345 Berlin","addressCountry":"DE"}
    ${additionalProperty}
  }]
}
</script>
</head><body>${badgeSection}</body></html>`;
}

/** Dakju pattern: JSON-LD has non-alcohol value, visible badge has Alkoholverkauf */
const HTML_BADGE_FALLBACK_POSITIVE = makeHtmlWithBadgeFallback('Asiatisch', [
  'Halal Fleisch',
  'Alkoholverkauf',
]);

/** Triple B pattern: JSON-LD has null-ish value, visible badge says Kein Alkoholverkauf */
const HTML_BADGE_FALLBACK_NEGATIVE = makeHtmlWithBadgeFallback(null, [
  'Kein Alkoholverkauf',
]);

/** No badges at all, JSON-LD non-decisive */
const HTML_BADGE_FALLBACK_NONE = makeHtmlWithBadgeFallback('Asiatisch', []);

describe('transformPage — HTML badge fallback (Plan 057)', () => {
  it('rejects when JSON-LD has non-alcohol value but visible badge says Alkoholverkauf', () => {
    const record = expectRecord(
      transformPage(HTML_BADGE_FALLBACK_POSITIVE, TEST_URL, CATEGORIES, false, OFFERS)
    );
    expect(record.review_status).toBe('rejected');
  });

  it('keeps pending when JSON-LD is empty but visible badge says Kein Alkoholverkauf', () => {
    const record = expectRecord(
      transformPage(HTML_BADGE_FALLBACK_NEGATIVE, TEST_URL, CATEGORIES, false, OFFERS)
    );
    expect(record.review_status).toBe('pending');
  });

  it('keeps pending when JSON-LD has non-alcohol value and no visible badges', () => {
    const record = expectRecord(
      transformPage(HTML_BADGE_FALLBACK_NONE, TEST_URL, CATEGORIES, false, OFFERS)
    );
    expect(record.review_status).toBe('pending');
  });
});
