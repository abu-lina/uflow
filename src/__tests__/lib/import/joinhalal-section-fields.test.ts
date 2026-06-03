/**
 * Plan 089 M4: JoinHalal pipeline section-field tests
 *
 * Verifies that transformPage() sets the new section fields:
 *   - listing_type: 'food'   (all JoinHalal imports are food providers)
 *   - no_alcohol: true       (JoinHalal is a halal-food directory; alcohol = rejection)
 *   - verification_method: 'online' (default)
 *   - has_certificate: false (default)
 *
 * TDD Gate: written BEFORE implementation changes to transformPage.
 */

import { describe, it, expect } from 'vitest';
import { transformPage } from '@/lib/import/joinhalal';
import type { Category, Offer } from '@/lib/import/joinhalal';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [{ category_id: 'cat-001', name_de: 'Restaurant' }];
const OFFERS: Offer[] = [];
const TEST_URL = 'https://joinhalal.com/locations/restaurant/test-place/';

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
    "name":"Test Place",
    "url":"${TEST_URL}",
    "address":{"@type":"PostalAddress","streetAddress":"Teststr. 1, 12345 Berlin","addressCountry":"DE"}
    ${additionalProperty}
  }]
}
</script>
</head><body><h1 class="page-title">Test Place</h1></body></html>`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('transformPage — Plan 089 section fields (M4)', () => {
  it('sets listing_type = food for all JoinHalal imports', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale('Handgeschächtet'), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).listing_type).toBe('food');
  });

  it('sets no_alcohol = true for non-alcohol entries', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale('Handgeschächtet'), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).no_alcohol).toBe(true);
  });

  it('sets no_alcohol = true even when Alkoholverkauf present (rejection is handled separately)', () => {
    // The no_alcohol field is set by the import; the review_status rejects but the field still reflects intent
    const { record } = transformPage(makeHtmlWithHalalMerkmale('Alkoholverkauf'), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).no_alcohol).toBe(true);
  });

  it('sets verification_method = online as default', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale(null), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).verification_method).toBe('online');
  });

  it('sets has_certificate = false as default', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale(null), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).has_certificate).toBe(false);
  });

  it('sets no_pork = false as default', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale(null), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).no_pork).toBe(false);
  });

  it('sets no_gambling = false as default', () => {
    const { record } = transformPage(makeHtmlWithHalalMerkmale(null), TEST_URL, CATEGORIES, false, OFFERS);
    expect(record).not.toBeNull();
    expect((record as unknown as Record<string, unknown>).no_gambling).toBe(false);
  });
});
