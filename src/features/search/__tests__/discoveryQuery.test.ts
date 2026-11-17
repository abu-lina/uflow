import { describe, expect, it } from 'vitest';

import type { WasSelection } from '../components/WasCategoryResults';

import {
  parseDiscoveryQuery,
  parseDiscoveryQueryForRoute,
  buildSectionChangeLink,
  buildStatusChangeLink,
  buildSearchTermLink,
  buildNearMeLink,
  buildViewToggleLink,
  readDiscoveryQueryInBrowser,
  buildResultsUrl,
  buildSearchResultsUrl,
  inferSectionFromCategory,
  getResultsPathForSection,
  getHomeSection,
  getHomeRedirectPath,
  getCityMapPath,
  resolveSectionFromSearchParams,
  GEMEINSCHAFT_SPENDEN_CATEGORY_ID,
} from '../discoveryQuery';

describe('Discovery Query module', () => {
  describe('free text (q)', () => {
    it('returns no free text when q is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.q).toBe('');
    });

    it('returns the value when q=kebab', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('q=kebab'));
      expect(result.q).toBe('kebab');
    });

    it('takes the first value for repeated q params', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('q=a&q=b'));
      expect(result.q).toBe('a');
    });
  });

  describe('category', () => {
    it('returns no category when absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.category).toBeNull();
    });

    it('returns no category when empty', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category='));
      expect(result.category).toBeNull();
    });

    it('returns the value as given', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category=some-uuid'));
      expect(result.category).toBe('some-uuid');
    });
  });

  describe('location (city)', () => {
    it('returns all cities when location is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.location).toBe('');
    });

    it('returns all cities when location is empty', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location='));
      expect(result.location).toBe('');
    });

    it('returns Everywhere as a literal city name', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Everywhere'));
      expect(result.location).toBe('Everywhere');
    });

    it('returns Überall as a literal city name', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=%C3%9Cberall'));
      expect(result.location).toBe('Überall');
    });

    it('returns a real city name as given', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Berlin'));
      expect(result.location).toBe('Berlin');
    });
  });

  describe('path-resolved city overrides query location', () => {
    it('uses the path city regardless of query location', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('location=Hamburg'), {
        city: 'Berlin',
      });
      expect(result.location).toBe('Berlin');
    });
  });

  describe('path-resolved category overrides query category', () => {
    it('uses the path category regardless of query category', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('category=from-query'), {
        category: 'from-path',
      });
      expect(result.category).toBe('from-path');
    });
  });

  describe('filters', () => {
    it('returns muslim and parken from valid mixed input', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('filters=muslim,notakey, parken'));
      expect(result.filters).toEqual(['muslim', 'parken']);
    });

    it('returns undefined when no known keys remain', () => {
      const result = parseDiscoveryQuery(new URLSearchParams('filters=notakey,bogus'));
      expect(result.filters).toBeUndefined();
    });

    it('returns undefined when filters param is absent', () => {
      const result = parseDiscoveryQuery(new URLSearchParams());
      expect(result.filters).toBeUndefined();
    });
  });

  describe('section (Listing Type) for the page reader', () => {
    it('falls back to food when an inactive Listing Type is passed', () => {
      const result = parseDiscoveryQuery(new URLSearchParams(), {
        section: 'store',
      });
      expect(result.section).toBe('food');
    });

    it('keeps an active Listing Type', () => {
      const result = parseDiscoveryQuery(new URLSearchParams(), {
        section: 'food',
      });
      expect(result.section).toBe('food');
    });
  });

  describe('section for the JSON route reader (parseDiscoveryQueryForRoute)', () => {
    it('returns undefined for section=business', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=business'));
      expect(result.section).toBeUndefined();
    });

    it('returns undefined for unknown section values', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=unknown'));
      expect(result.section).toBeUndefined();
    });

    it('returns food for section=food', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=food'));
      expect(result.section).toBe('food');
    });

    it('returns ummah for section=ummah', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=ummah'));
      expect(result.section).toBe('ummah');
    });

    it('returns store for section=store', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('section=store'));
      expect(result.section).toBe('store');
    });
  });

  describe('status for the JSON route reader', () => {
    it.each(['approved', 'pending', 'rejected', 'needs_revision', 'all'] as const)(
      'accepts %s as a valid status',
      (status) => {
        const result = parseDiscoveryQueryForRoute(new URLSearchParams(`status=${status}`));
        expect(result.status).toBe(status);
      },
    );

    it('returns an error result for invalid status values', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams('status=invalid'));
      expect(result.statusError).toBeTruthy();
    });

    it('returns no status when absent', () => {
      const result = parseDiscoveryQueryForRoute(new URLSearchParams());
      expect(result.status).toBeUndefined();
      expect(result.statusError).toBeUndefined();
    });
  });

  // ── Writers ──────────────────────────────────────────────────────────

  describe('buildSectionChangeLink', () => {
    it('keeps q and filters, drops everything else', () => {
      const link = buildSectionChangeLink(
        '/food/berlin?q=kebab&category=abc&filters=muslim&status=pending&view=map',
        'store',
      );
      expect(link).toBe('/stores?q=kebab&filters=muslim');
    });

    it('returns the bare section path when there are no q or filters', () => {
      const link = buildSectionChangeLink('/food/berlin?category=abc&status=pending', 'ummah');
      expect(link).toBe('/ummah');
    });

    it('keeps filters alone when q is absent', () => {
      const link = buildSectionChangeLink('/food?filters=muslim', 'store');
      expect(link).toBe('/stores?filters=muslim');
    });

    it('keeps q alone when filters is absent', () => {
      const link = buildSectionChangeLink('/ummah?q=test', 'food');
      expect(link).toBe('/food?q=test');
    });
  });

  describe('buildStatusChangeLink', () => {
    it('sets status and removes section', () => {
      const link = buildStatusChangeLink('/food/berlin?q=kebab&section=food&view=map', 'pending');
      expect(link).toBe('/food/berlin?q=kebab&view=map&status=pending');
    });

    it('removes status when null', () => {
      const link = buildStatusChangeLink('/food/berlin?q=kebab&status=pending', null);
      expect(link).toBe('/food/berlin?q=kebab');
    });

    it('removes section even when status is null', () => {
      const link = buildStatusChangeLink('/food?section=food&status=approved', null);
      expect(link).toBe('/food');
    });

    it('preserves other parameters in order', () => {
      const link = buildStatusChangeLink('/food?filters=muslim&view=map&q=test', 'rejected');
      expect(link).toBe('/food?filters=muslim&view=map&q=test&status=rejected');
    });
  });

  describe('buildSearchTermLink', () => {
    it('sets q and removes section', () => {
      const link = buildSearchTermLink('/food/berlin?filters=muslim&section=food', ' kebab ');
      expect(link).toBe('/food/berlin?filters=muslim&q=kebab');
    });

    it('removes q when text is empty', () => {
      const link = buildSearchTermLink('/food?q=old&view=map', '');
      expect(link).toBe('/food?view=map');
    });

    it('removes q when text is whitespace', () => {
      const link = buildSearchTermLink('/food?q=old', '   ');
      expect(link).toBe('/food');
    });

    it('preserves other parameters', () => {
      const link = buildSearchTermLink('/food?status=pending&filters=muslim', 'halal');
      expect(link).toBe('/food?status=pending&filters=muslim&q=halal');
    });
  });

  describe('buildNearMeLink', () => {
    it('activates near-me on a results path', () => {
      const link = buildNearMeLink({
        section: 'food',
        active: true,
        openNow: false,
        pathname: '/food/berlin',
        searchParams: new URLSearchParams('q=kebab'),
      });
      expect(link).toBe('/food?q=kebab&near_me=1');
    });

    it('deactivates near-me and keeps the current path', () => {
      const link = buildNearMeLink({
        section: 'food',
        active: false,
        openNow: false,
        pathname: '/food/berlin',
        searchParams: new URLSearchParams('q=kebab&near_me=1'),
      });
      expect(link).toBe('/food/berlin?q=kebab');
    });

    it('sets open_now when active', () => {
      const link = buildNearMeLink({
        section: 'food',
        active: true,
        openNow: true,
        pathname: '/food',
        searchParams: new URLSearchParams(),
      });
      expect(link).toBe('/food?near_me=1&open_now=1');
    });

    it('removes open_now when inactive', () => {
      const link = buildNearMeLink({
        section: 'food',
        active: false,
        openNow: false,
        pathname: '/food',
        searchParams: new URLSearchParams('open_now=1'),
      });
      expect(link).toBe('/food');
    });

    it('strips stale near_lat, near_lon, near_radius params', () => {
      const link = buildNearMeLink({
        section: 'food',
        active: true,
        openNow: false,
        pathname: '/food',
        searchParams: new URLSearchParams('near_lat=52&near_lon=13&near_radius=5'),
      });
      expect(link).toBe('/food?near_me=1');
    });
  });

  describe('buildViewToggleLink', () => {
    it('adds view=map', () => {
      const link = buildViewToggleLink('/food?q=kebab', 'map', 'list');
      expect(link).toBe('/food?q=kebab&view=map');
    });

    it('removes view when it matches the default', () => {
      const link = buildViewToggleLink('/food?q=kebab&view=map', 'list', 'list');
      expect(link).toBe('/food?q=kebab');
    });

    it('keeps view when it differs from the default', () => {
      const link = buildViewToggleLink('/food?q=kebab', 'map', 'map');
      expect(link).toBe('/food?q=kebab');
    });

    it('preserves other parameters', () => {
      const link = buildViewToggleLink('/food?filters=muslim&status=pending', 'map', 'list');
      expect(link).toBe('/food?filters=muslim&status=pending&view=map');
    });
  });

  // ── Browser reader ───────────────────────────────────────────────────

  describe('readDiscoveryQueryInBrowser', () => {
    it('reads q, category, location, filters from the link', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food/berlin/kebab?q=test&category=abc&location=Hamburg&filters=muslim',
        new URLSearchParams('q=test&category=abc&location=Hamburg&filters=muslim'),
      );
      expect(result.q).toBe('test');
      expect(result.category).toBe('abc');
      expect(result.location).toBe('Hamburg');
      expect(result.filters).toEqual(['muslim']);
    });

    it('resolves section via resolveSectionFromRoute, not parseDiscoveryQuery', () => {
      const result = readDiscoveryQueryInBrowser('/stores', new URLSearchParams());
      expect(result.section).toBe('store');
    });

    it('resolves section from pathname when inactive', () => {
      const result = readDiscoveryQueryInBrowser('/stores', new URLSearchParams());
      // resolveSectionFromRoute returns 'store' from /stores path
      // parseDiscoveryQuery would fall back to 'food' because store is inactive
      expect(result.section).toBe('store');
    });

    it('reads near_me and open_now as booleans', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food',
        new URLSearchParams('near_me=1&open_now=1'),
      );
      expect(result.nearMe).toBe(true);
      expect(result.openNow).toBe(true);
    });

    it('defaults near_me and open_now to false', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams());
      expect(result.nearMe).toBe(false);
      expect(result.openNow).toBe(false);
    });

    it('reads status from four valid values', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams('status=pending'));
      expect(result.status).toBe('pending');
    });

    it('returns null status for invalid values including all', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams('status=all'));
      expect(result.status).toBeNull();
    });

    it('returns null status when absent', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams());
      expect(result.status).toBeNull();
    });

    it('reads view as map or list', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams('view=map'));
      expect(result.view).toBe('map');
    });

    it('returns null view for unknown values', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams('view=grid'));
      expect(result.view).toBeNull();
    });

    it('treats Everywhere as a city name, not all cities', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food',
        new URLSearchParams('location=Everywhere'),
      );
      expect(result.location).toBe('Everywhere');
    });

    it('treats Überall as a city name, not all cities', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food',
        new URLSearchParams('location=%C3%9Cberall'),
      );
      expect(result.location).toBe('Überall');
    });

    it('uses page category over query category', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food/berlin/kebab',
        new URLSearchParams('category=from-query'),
        { category: 'from-path' },
      );
      expect(result.category).toBe('from-path');
    });

    it('uses page city over query location', () => {
      const result = readDiscoveryQueryInBrowser(
        '/food/berlin',
        new URLSearchParams('location=Hamburg'),
        { city: 'Berlin' },
      );
      expect(result.location).toBe('Berlin');
    });

    it('does not fall back to a remembered category', () => {
      const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams(), {
        category: undefined,
      });
      expect(result.category).toBeNull();
    });
  });
});

// ── Moved from search-params.test.ts ────────────────────────────────────

const KEBAB_ID = '9026edb0-490a-4395-a3d7-27c5eacde0e2';

describe('buildResultsUrl — category must never be silently dropped (#254)', () => {
  it('falls back to ?category=<id> when no city is selected', () => {
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

// ── Moved from sectionFilters.test.ts ───────────────────────────────────

const ESSEN_TRINKEN_ID = '20c10efe-404b-4a39-bb81-5089a0332d78';
const GEMEINSCHAFT_SPENDEN_ID = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
const DIENSTLEISTUNGEN_ID = 'some-other-uuid-business';

describe('inferSectionFromCategory (module)', () => {
  it('returns food for Essen & Trinken category UUID', () => {
    expect(inferSectionFromCategory(ESSEN_TRINKEN_ID)).toBe('food');
  });

  it('returns ummah for Gemeinschaft & Spenden category UUID', () => {
    expect(inferSectionFromCategory(GEMEINSCHAFT_SPENDEN_ID)).toBe('ummah');
  });

  it('returns store for any other category UUID', () => {
    expect(inferSectionFromCategory(DIENSTLEISTUNGEN_ID)).toBe('store');
  });

  it('returns store for null/undefined category', () => {
    expect(inferSectionFromCategory(null)).toBe('store');
    expect(inferSectionFromCategory(undefined)).toBe('store');
  });
});

describe('getResultsPathForSection', () => {
  it('maps food to /food', () => {
    expect(getResultsPathForSection('food')).toBe('/food');
  });

  it('maps ummah to /ummah', () => {
    expect(getResultsPathForSection('ummah')).toBe('/ummah');
  });

  it('maps store to /stores', () => {
    expect(getResultsPathForSection('store')).toBe('/stores');
  });
});

describe('getHomeSection', () => {
  it('returns food (the default active section)', () => {
    expect(getHomeSection()).toBe('food');
  });
});

describe('getHomeRedirectPath', () => {
  it('returns /food with no params', () => {
    expect(getHomeRedirectPath(new URLSearchParams())).toBe('/food');
  });

  it('preserves query string', () => {
    expect(getHomeRedirectPath(new URLSearchParams('q=kebab'))).toBe('/food?q=kebab');
  });
});

describe('getCityMapPath', () => {
  it('returns /food?location=Berlin&view=map for a city', () => {
    expect(getCityMapPath('Berlin')).toBe('/food?location=Berlin&view=map');
  });

  it('returns /food?view=map for null city', () => {
    expect(getCityMapPath(null)).toBe('/food?view=map');
  });

  it('respects explicit params', () => {
    expect(getCityMapPath('Berlin', new URLSearchParams('view=list'))).toBe(
      '/food?view=list&location=Berlin',
    );
  });
});

describe('resolveSectionFromSearchParams', () => {
  it('resolves food from section=food', () => {
    expect(resolveSectionFromSearchParams(new URLSearchParams('section=food'))).toBe('food');
  });

  it('resolves store from section=store', () => {
    expect(resolveSectionFromSearchParams(new URLSearchParams('section=store'))).toBe('store');
  });

  it('defaults to food when section is unknown', () => {
    expect(resolveSectionFromSearchParams(new URLSearchParams('section=xyz'))).toBe('food');
  });

  it('section=business falls through to food (legacy mapping removed)', () => {
    expect(resolveSectionFromSearchParams(new URLSearchParams('section=business'))).toBe('food');
  });

  it('infers section from category when section is absent', () => {
    expect(
      resolveSectionFromSearchParams(new URLSearchParams(`category=${ESSEN_TRINKEN_ID}`)),
    ).toBe('food');
  });
});

describe('GEMEINSCHAFT_SPENDEN_CATEGORY_ID export', () => {
  it('has the expected UUID', () => {
    expect(GEMEINSCHAFT_SPENDEN_CATEGORY_ID).toBe('4470c3e0-458f-40a6-a96e-ca0fbdf145d7');
  });
});

// ── #918 pin tests: readDiscoveryQueryInBrowser with section=business ────

describe('readDiscoveryQueryInBrowser — section=business pin tests', () => {
  it('on /food path with section=business, pathname wins → food', () => {
    const result = readDiscoveryQueryInBrowser('/food', new URLSearchParams('section=business'));
    expect(result.section).toBe('food');
  });

  it('on /stores path with section=business, invalid section falls through → food', () => {
    const result = readDiscoveryQueryInBrowser('/stores', new URLSearchParams('section=business'));
    // section=business is invalid (legacy mapping removed), ?section= has priority,
    // so it falls through to the default (food), not pathname.
    expect(result.section).toBe('food');
  });
});

// ── #918 pin test: unknown filter key is dropped ─────────────────────────

describe('readDiscoveryQueryInBrowser — unknown filter key dropped', () => {
  it('filters=muslim,notakey keeps only muslim', () => {
    const result = readDiscoveryQueryInBrowser(
      '/food',
      new URLSearchParams('filters=muslim,notakey'),
    );
    expect(result.filters).toEqual(['muslim']);
  });
});

// ── #918 Red: buildResultsUrl status parameter ─────────────────────────

describe('buildResultsUrl — status parameter', () => {
  it('appends status when provided', () => {
    expect(buildResultsUrl({ section: 'food', status: 'pending' })).toBe('/food?status=pending');
  });

  it('omits status when null', () => {
    expect(buildResultsUrl({ section: 'food', status: null })).toBe('/food');
  });

  it('combines status with query and filters', () => {
    const url = buildResultsUrl({
      section: 'food',
      query: 'kebab',
      filters: ['muslim'],
      status: 'approved',
    });
    expect(url).toBe('/food?q=kebab&filters=muslim&status=approved');
  });
});
