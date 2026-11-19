import { describe, expect, it } from 'vitest';
import { sortByDefaultOrder } from '@/services/providers/search';

type MinProvider = { provider_id: string; provider_name: string; address_city: string | null };

function make(id: string, name: string, city: string | null): MinProvider {
  return { provider_id: id, provider_name: name, address_city: city };
}

describe('#953 default order: city population desc, name asc, id asc', () => {
  it('puts Berlin (3.6M) before Kiel (250k) when both present', () => {
    const input = [make('1', 'Alpha', 'Kiel'), make('2', 'Beta', 'Berlin')];
    const result = sortByDefaultOrder(input);
    expect(result[0].address_city).toBe('Berlin');
    expect(result[1].address_city).toBe('Kiel');
  });

  it('puts München before Chemnitz', () => {
    const input = [make('1', 'Z Restaurant', 'Chemnitz'), make('2', 'A Restaurant', 'München')];
    const result = sortByDefaultOrder(input);
    expect(result[0].address_city).toBe('München');
  });

  it('sorts alphabetically by name within the same city', () => {
    const input = [
      make('1', 'Zaza Chicken', 'Berlin'),
      make('2', 'Alpha Kebab', 'Berlin'),
      make('3', 'Mango Grill', 'Berlin'),
    ];
    const result = sortByDefaultOrder(input);
    expect(result.map((r) => r.provider_name)).toEqual([
      'Alpha Kebab',
      'Mango Grill',
      'Zaza Chicken',
    ]);
  });

  it('uses provider_id as tiebreaker for same city + same name', () => {
    const input = [make('z-id', 'Same Name', 'Berlin'), make('a-id', 'Same Name', 'Berlin')];
    const result = sortByDefaultOrder(input);
    expect(result[0].provider_id).toBe('a-id');
  });

  it('places providers with unknown city at the end', () => {
    const input = [make('1', 'Unknown', null), make('2', 'Berlin Restaurant', 'Berlin')];
    const result = sortByDefaultOrder(input);
    expect(result[0].address_city).toBe('Berlin');
    expect(result[1].address_city).toBeNull();
  });

  it('no more than 2 of the first 12 results share the same brand prefix', () => {
    // Simulate a bulk-import scenario: 9 "Loco Chicken" entries from various cities
    const locoCities = [
      'Chemnitz',
      'Dresden',
      'Kiel',
      'Potsdam',
      'Freiburg',
      'Würzburg',
      'Osnabrück',
      'Magdeburg',
      'Rostock',
    ];
    const locoEntries = locoCities.map((city, i) =>
      make(`loco-${i}`, `Loco Chicken | ${city}`, city),
    );
    // 3 Berlin providers from other brands
    const berlinEntries = [
      make('b1', 'Al-Sham', 'Berlin'),
      make('b2', 'Halal Bros', 'Berlin'),
      make('b3', 'Kabul Kitchen', 'Berlin'),
    ];
    const result = sortByDefaultOrder([...locoEntries, ...berlinEntries]);
    const first12 = result.slice(0, 12);
    const locoCounts = first12.filter((r) => r.provider_name.startsWith('Loco Chicken')).length;
    expect(locoCounts).toBeLessThanOrEqual(2);
  });
});
