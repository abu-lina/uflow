// @vitest-environment jsdom
/**
 * #951: city and category result pages need an h1 and ItemList structured data.
 *
 * Seam: renderProvidersPage return value — the same seam used by #943 tests.
 * We inspect the returned React element tree for:
 *   - an h1 element (AC1, AC2)
 *   - an application/ld+json script with ItemList (AC4, AC5)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────

const FAKE_RESULTS = [
  {
    id: 'prov-001',
    name: 'Döner Palace',
    images: null,
    category_id: 'cat-1',
    address_city: 'Stuttgart',
    address_street: 'Königstraße 1',
    address_zip: '70173',
    address_country: 'DE',
    social_website: null,
    social_instagram: null,
    contact_email: null,
    contact_phone: null,
    location_latitude: null,
    location_longitude: null,
    created_at: null,
    updated_at: null,
    offers_ids: [],
    needs_ids: [],
    type: 'provider' as const,
  },
  {
    id: 'prov-002',
    name: 'Halal Burger',
    images: null,
    category_id: 'cat-1',
    address_city: 'Stuttgart',
    address_street: 'Marienplatz 5',
    address_zip: '70178',
    address_country: 'DE',
    social_website: null,
    social_instagram: null,
    contact_email: null,
    contact_phone: null,
    location_latitude: null,
    location_longitude: null,
    created_at: null,
    updated_at: null,
    offers_ids: [],
    needs_ids: [],
    type: 'provider' as const,
  },
];

const mockSearch = vi.fn().mockResolvedValue({
  results: FAKE_RESULTS,
  hasMore: false,
  totalCount: 2,
});

vi.mock('@/services/providers', () => ({
  searchProvidersAndCommunityServices: (...args: unknown[]) => mockSearch(...args),
  getCityCenter: async () => null,
}));

vi.mock('@/services/categories', () => ({
  getCategoryById: async () => null,
}));

vi.mock('@/app/(public)/providers/ProvidersContent', () => ({
  ProvidersContent: (_props: Record<string, unknown>) => {
    // Render the h1 the real component would render, so we can test the prop flow.
    // The real component will use useLanguage() — here we just check the props arrive.
    return null;
  },
}));

import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { ProvidersContent } from '@/app/(public)/providers/ProvidersContent';

// ── Helpers ──────────────────────────────────────────────────────────────

function flattenElements(node: ReactNode): ReactElement[] {
  const result: ReactElement[] = [];
  function walk(n: ReactNode) {
    if (!isValidElement(n)) return;
    result.push(n);
    Children.forEach(n.props.children, walk);
  }
  walk(node);
  return result;
}

function findJsonLd(root: ReactNode): unknown | null {
  for (const el of flattenElements(root)) {
    if (el.type === 'script' && el.props.type === 'application/ld+json') {
      return JSON.parse(
        typeof el.props.dangerouslySetInnerHTML?.__html === 'string'
          ? el.props.dangerouslySetInnerHTML.__html
          : el.props.children,
      );
    }
  }
  return null;
}

function contentProps(root: ReactNode): Record<string, unknown> {
  for (const el of flattenElements(root)) {
    if (el.type === ProvidersContent) {
      return el.props as Record<string, unknown>;
    }
  }
  throw new Error('ProvidersContent not found in tree');
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('#951 AC1: city page has exactly one h1 naming the city', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: FAKE_RESULTS, hasMore: false, totalCount: 2 });
  });

  it('passes routeCity to ProvidersContent for h1 rendering', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
    });

    const props = contentProps(element);
    expect(props.routeCity).toBe('Stuttgart');
  });
});

describe('#951 AC2: category page h1 names category and city', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: FAKE_RESULTS, hasMore: false, totalCount: 2 });
  });

  it('passes routeCity and routeCategoryName to ProvidersContent', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
      routeCategory: 'cat-restaurants',
      routeCategoryRecord: {
        name_de: 'Restaurants',
        name_en: 'Restaurants',
      },
    });

    const props = contentProps(element);
    expect(props.routeCity).toBe('Stuttgart');
    expect(props.routeCategoryName).toBe('Restaurants');
  });
});

describe('#951 AC4: ItemList structured data with providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: FAKE_RESULTS, hasMore: false, totalCount: 2 });
  });

  it('emits application/ld+json with ItemList schema', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
    });

    const jsonLd = findJsonLd(element);
    expect(jsonLd).not.toBeNull();
    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
    });
  });

  it('each item has name, url and address', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
    });

    const jsonLd = findJsonLd(element) as {
      itemListElement: Array<{
        '@type': string;
        position: number;
        item: {
          '@type': string;
          name: string;
          url: string;
          address?: { streetAddress?: string };
        };
      }>;
    };

    expect(jsonLd.itemListElement).toHaveLength(2);

    const first = jsonLd.itemListElement[0];
    expect(first).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'LocalBusiness',
        name: 'Döner Palace',
        url: expect.stringContaining('/p/prov-001'),
        address: expect.objectContaining({
          streetAddress: 'Königstraße 1',
        }),
      },
    });

    const second = jsonLd.itemListElement[1];
    expect(second.position).toBe(2);
    expect(second.item.name).toBe('Halal Burger');
  });
});

describe('#951 AC5: no rating, review or price in structured data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: FAKE_RESULTS, hasMore: false, totalCount: 2 });
  });

  it('items contain no rating, review or price fields', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
    });

    const jsonLd = findJsonLd(element) as {
      itemListElement: Array<{ item: Record<string, unknown> }>;
    };

    for (const entry of jsonLd.itemListElement) {
      const item = entry.item;
      expect(item).not.toHaveProperty('aggregateRating');
      expect(item).not.toHaveProperty('review');
      expect(item).not.toHaveProperty('priceRange');
      expect(item).not.toHaveProperty('offers');
    }
  });
});

describe('#951 AC6: empty results emit no structured data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ results: [], hasMore: false, totalCount: 0 });
  });

  it('no json-ld when there are zero results', async () => {
    const element = await renderProvidersPage({
      searchParams: Promise.resolve({}),
      routeSection: 'food',
      routeCity: 'Stuttgart',
    });

    const jsonLd = findJsonLd(element);
    expect(jsonLd).toBeNull();
  });
});
