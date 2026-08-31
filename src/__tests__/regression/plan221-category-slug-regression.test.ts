import { describe, expect, it } from 'vitest';
import { buildSearchResultsUrl } from '@/lib/search-params';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

describe('Plan 221 — category slug must use DB slug, not slugified German label', () => {
  it('uses categorySlug when present, not slugify(label)', () => {
    const selection: WasSelection = {
      type: 'category',
      label: 'Türkisch',
      categoryId: '232c2870-7929-43eb-a909-6cac90203192',
      categorySlug: 'turkish',
    };

    const url = buildSearchResultsUrl({
      selectedWas: selection,
      selectedSection: 'food',
      selectedCity: 'Stuttgart',
    });

    expect(url).toBe('/food/stuttgart/turkish');
    expect(url).not.toContain('tuerkisch');
  });

  it('omits category from path when categorySlug is missing (old localStorage entry)', () => {
    const selection: WasSelection = {
      type: 'category',
      label: 'Türkisch',
      categoryId: '232c2870-7929-43eb-a909-6cac90203192',
      // categorySlug intentionally omitted — simulates pre-PR-348 localStorage
    };

    const url = buildSearchResultsUrl({
      selectedWas: selection,
      selectedSection: 'food',
      selectedCity: 'Stuttgart',
    });

    // Must NOT produce /food/stuttgart/tuerkisch (German-derived slug)
    expect(url).not.toContain('tuerkisch');
    // Without a valid slug, the category segment is dropped from the path
    expect(url).toBe('/food/stuttgart');
  });

  it('still includes categorySlug for English-named categories', () => {
    const selection: WasSelection = {
      type: 'category',
      label: 'Burger',
      categoryId: 'some-id',
      categorySlug: 'burger',
    };

    const url = buildSearchResultsUrl({
      selectedWas: selection,
      selectedSection: 'food',
      selectedCity: 'Berlin',
    });

    expect(url).toBe('/food/berlin/burger');
  });
});
