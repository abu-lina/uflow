import { describe, it, expect } from 'vitest';
import { buildNearMeUrl, buildResultsUrl, buildSearchResultsUrl } from '@/lib/search-params';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

const KEBAB_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';

describe('buildResultsUrl — category must never be silently dropped (#254)', () => {
  it('falls back to ?category=<id> when no city is selected', () => {
    // Pre-fix behaviour: the category lived inside `if (city)`, so this call
    // produced a bare '/food' and the filter silently widened to everything.
    const url = buildResultsUrl({
      section: 'food',
      city: null,
      categorySlug: 'kebab-doener',
      categoryId: KEBAB_ID,
    });
    expect(url).toBe(`/food?category=${KEBAB_ID}`);
  });

  it('keeps the path form when city and slug are present', () => {
    const url = buildResultsUrl({
      section: 'food',
      city: 'Berlin',
      categorySlug: 'kebab-doener',
      categoryId: KEBAB_ID,
    });
    expect(url).toBe('/food/berlin/kebab-doener');
  });

  it('falls back to ?category=<id> when the id is known but the slug is missing', () => {
    const url = buildResultsUrl({
      section: 'food',
      city: 'Berlin',
      categorySlug: null,
      categoryId: KEBAB_ID,
    });
    expect(url).toBe(`/food/berlin?category=${KEBAB_ID}`);
  });

  it('applies the same fallback on non-food sections', () => {
    const url = buildResultsUrl({
      section: 'store',
      city: null,
      categorySlug: 'einzelhandel',
      categoryId: KEBAB_ID,
    });
    expect(url).toBe(`/stores?category=${KEBAB_ID}`);
  });

  it('never puts a bare slug (non-UUID) into the ?category param', () => {
    // Callers that only hold a slug keep the old no-category URL rather than
    // emitting a param the service would reject as invalid.
    const url = buildResultsUrl({
      section: 'ummah',
      categorySlug: 'gemeinschaft-spenden',
    });
    expect(url).toBe('/ummah');
  });

  it('still emits query and filters alongside the category fallback', () => {
    const url = buildResultsUrl({
      section: 'food',
      city: null,
      categorySlug: 'kebab-doener',
      categoryId: KEBAB_ID,
      query: 'döner',
      filters: ['muslim_owned'],
    });
    expect(url).toBe(`/food?q=d%C3%B6ner&category=${KEBAB_ID}&filters=muslim_owned`);
  });
});

describe('buildSearchResultsUrl — #254 category with no city', () => {
  it('produces /food?category=<id> for a category selection with no city', () => {
    const selectedWas: WasSelection = {
      type: 'category',
      label: 'Kebab / Döner',
      categoryId: KEBAB_ID,
      categorySlug: 'kebab-doener',
    };
    const url = buildSearchResultsUrl({
      selectedWas,
      selectedSection: 'food',
      selectedCity: null,
    });
    expect(url).toBe(`/food?category=${KEBAB_ID}`);
  });

  it('pins the with-city path form /food/berlin/kebab-doener', () => {
    const selectedWas: WasSelection = {
      type: 'category',
      label: 'Kebab / Döner',
      categoryId: KEBAB_ID,
      categorySlug: 'kebab-doener',
    };
    const url = buildSearchResultsUrl({
      selectedWas,
      selectedSection: 'food',
      selectedCity: 'Berlin',
    });
    expect(url).toBe('/food/berlin/kebab-doener');
  });
});

describe('buildNearMeUrl', () => {
  it('strips the city to the section root and sets near_me=1 when active', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: false,
      pathname: '/food/stuttgart',
      searchParams: new URLSearchParams(),
    });
    expect(url).toBe('/food?near_me=1');
  });

  it('keeps the current pathname when deactivating near-me', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: false,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('near_me=1'),
    });
    expect(url).toBe('/food');
  });

  it('preserves unrelated params and sets open_now', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: true,
      pathname: '/food/stuttgart',
      searchParams: new URLSearchParams('q=pizza&filters=muslim'),
    });
    expect(url).toBe('/food?q=pizza&filters=muslim&near_me=1&open_now=1');
  });

  it('deletes stale near_lat/near_lon/near_radius params', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: true,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('near_lat=48&near_lon=9&near_radius=5'),
    });
    expect(url).toBe('/food?near_me=1');
  });

  it('deletes open_now when openNow is false', () => {
    const url = buildNearMeUrl({
      section: 'food',
      active: false,
      openNow: false,
      pathname: '/food',
      searchParams: new URLSearchParams('open_now=1'),
    });
    expect(url).toBe('/food');
  });
});
