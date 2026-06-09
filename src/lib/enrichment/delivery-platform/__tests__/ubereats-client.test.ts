import { describe, it, expect } from 'vitest';
import { parsePriceToCents, extractSearchResultsFromState, extractRestaurantFromState, extractMenuFromState } from '../ubereats-client';
import type { UberEatsMenuCategory } from '../ubereats-types';

describe('parsePriceToCents', () => {
  it('parses German EUR format: "10,50 €"', () => {
    expect(parsePriceToCents('10,50 €')).toBe(1050);
  });

  it('parses German EUR format without space: "10,50€"', () => {
    expect(parsePriceToCents('10,50€')).toBe(1050);
  });

  it('parses whole euros: "5,00 €"', () => {
    expect(parsePriceToCents('5,00 €')).toBe(500);
  });

  it('parses large prices: "100,00 €"', () => {
    expect(parsePriceToCents('100,00 €')).toBe(10000);
  });

  it('parses prices with cents only: "0,99 €"', () => {
    expect(parsePriceToCents('0,99 €')).toBe(99);
  });

  it('parses prices without currency symbol: "12,50"', () => {
    expect(parsePriceToCents('12,50')).toBe(1250);
  });

  it('returns 0 for invalid strings', () => {
    expect(parsePriceToCents('')).toBe(0);
    expect(parsePriceToCents('abc')).toBe(0);
    expect(parsePriceToCents('€€€')).toBe(0);
  });
});

describe('extractSearchResultsFromState', () => {
  it('extracts stores from pageData.catalog.sections[].items[].store', () => {
    const state = {
      pageData: {
        catalog: {
          sections: [
            {
              items: [
                {
                  store: {
                    title: 'Test Restaurant',
                    slug: 'test-restaurant-abc',
                    rating: { ratingValue: 4.5 },
                    estimate: { estimate: 25 },
                    active: true,
                  },
                },
                {
                  store: {
                    title: 'Second Restaurant',
                    slug: 'second-restaurant-def',
                    rating: { ratingValue: 3.8 },
                  },
                },
              ],
            },
          ],
        },
      },
    };

    const results = extractSearchResultsFromState(state);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Test Restaurant');
    expect(results[0].slug).toBe('test-restaurant-abc');
    expect(results[0].rating).toBe(4.5);
    expect(results[0].estimatedDeliveryMinutes).toBe(25);
    expect(results[0].isActive).toBe(true);

    expect(results[1].name).toBe('Second Restaurant');
    expect(results[1].slug).toBe('second-restaurant-def');
    expect(results[1].rating).toBe(3.8);
    expect(results[1].estimatedDeliveryMinutes).toBeNull();
    expect(results[1].isActive).toBe(true);
  });

  it('deduplicates by slug', () => {
    const state = {
      pageData: {
        catalog: {
          sections: [
            {
              items: [
                { store: { title: 'Dupe', slug: 'dupe-1' } },
                { store: { title: 'Dupe', slug: 'dupe-1' } },
              ],
            },
          ],
        },
      },
    };

    const results = extractSearchResultsFromState(state);
    expect(results).toHaveLength(1);
  });

  it('falls back to searchResults array when catalog is empty', () => {
    const state = {
      searchResults: [
        { store: { title: 'Fallback Restaurant', slug: 'fallback-1', rating: 4.0 } },
      ],
    };

    const results = extractSearchResultsFromState(state);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fallback Restaurant');
    expect(results[0].slug).toBe('fallback-1');
  });

  it('returns empty array when no stores found', () => {
    const state = { pageData: { catalog: { sections: [] } } };
    const results = extractSearchResultsFromState(state);
    expect(results).toEqual([]);
  });

  it('returns empty array when state is empty', () => {
    const results = extractSearchResultsFromState({});
    expect(results).toEqual([]);
  });

  it('handles null/undefined store entries gracefully', () => {
    const state = {
      pageData: {
        catalog: {
          sections: [
            { items: [{ store: null }, {}, { store: { title: 'Valid', slug: 'valid-1' } }] },
          ],
        },
      },
    };

    const results = extractSearchResultsFromState(state);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Valid');
  });
});

describe('extractMenuFromState', () => {
  it('extracts menu categories and items from store.menu', () => {
    const state: Record<string, unknown> = {
      store: {
        menu: [
          {
            title: 'Pizzas',
            items: [
              { title: 'Margherita', description: 'Tomato, cheese', price: '9,50 €' },
              { title: 'Salami', description: null, price: '11,00 €' },
            ],
          },
          {
            title: 'Drinks',
            items: [
              { title: 'Cola', description: '0.5L', price: '3,50 €' },
            ],
          },
        ],
      },
    };

    const categories = extractMenuFromState(state);

    expect(categories).toHaveLength(2);

    expect(categories[0].name).toBe('Pizzas');
    expect(categories[0].items).toHaveLength(2);
    expect(categories[0].items[0].name).toBe('Margherita');
    expect(categories[0].items[0].description).toBe('Tomato, cheese');
    expect(categories[0].items[0].priceCents).toBe(950);
    expect(categories[0].items[1].priceCents).toBe(1100);

    expect(categories[1].name).toBe('Drinks');
    expect(categories[1].items).toHaveLength(1);
    expect(categories[1].items[0].priceCents).toBe(350);
  });

  it('skips items without title', () => {
    const state: Record<string, unknown> = {
      store: {
        menu: [
          {
            title: 'Specials',
            items: [
              { title: 'Item 1', price: '5,00 €' },
              { description: 'No name', price: '3,00 €' },
              { title: 'Item 2', price: '7,00 €' },
            ],
          },
        ],
      },
    };

    const categories = extractMenuFromState(state);
    expect(categories).toHaveLength(1);
    expect(categories[0].items).toHaveLength(2);
  });

  it('returns empty array when no store data', () => {
    const categories = extractMenuFromState({});
    expect(categories).toEqual([]);
  });

  it('returns empty array when store has no menu', () => {
    const categories = extractMenuFromState({ store: { title: 'Test' } });
    expect(categories).toEqual([]);
  });

  it('handles numeric price values', () => {
    const state: Record<string, unknown> = {
      store: {
        menu: [
          {
            title: 'Items',
            items: [{ title: 'Item', price: 12.5 }],
          },
        ],
      },
    };

    const categories = extractMenuFromState(state);
    expect(categories[0].items[0].priceCents).toBe(1250);
  });
});

describe('extractRestaurantFromState', () => {
  it('extracts full restaurant data from store state', () => {
    const state: Record<string, unknown> = {
      store: {
        title: 'Test Restaurant',
        description: 'A great place',
        rating: { ratingValue: 4.2 },
        hours: { monday: { open: '09:00', close: '22:00' } },
        menu: [
          {
            title: 'Main',
            items: [{ title: 'Burger', price: '12,00 €' }],
          },
        ],
      },
    };

    const result = extractRestaurantFromState('test-slug', state);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('Test Restaurant');
    expect(result!.slug).toBe('test-slug');
    expect(result!.description).toBe('A great place');
    expect(result!.rating).toBe(4.2);
    expect(result!.openingHours).toEqual({ monday: { open: '09:00', close: '22:00' } });
    expect(result!.menuCategories).toHaveLength(1);
    expect(result!.deliveryUrl).toBe('https://www.ubereats.com/de/store/test-slug');
  });

  it('returns null when store data is missing', () => {
    const result = extractRestaurantFromState('test-slug', {});
    expect(result).toBeNull();
  });

  it('returns null when store has no title', () => {
    const result = extractRestaurantFromState('test-slug', { store: { slug: 'test' } });
    expect(result).toBeNull();
  });
});
