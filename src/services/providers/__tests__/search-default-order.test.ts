import { describe, expect, it } from 'vitest';
import { sortByDefaultOrder } from '@/services/providers/search';

type MinResult = { id: string; name: string; address_city: string | null };

function make(id: string, name: string, city: string | null): MinResult {
  return { id, name, address_city: city };
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
    expect(result.map((r) => r.name)).toEqual(['Alpha Kebab', 'Mango Grill', 'Zaza Chicken']);
  });

  it('uses id as tiebreaker for same city + same name', () => {
    const input = [make('z-id', 'Same Name', 'Berlin'), make('a-id', 'Same Name', 'Berlin')];
    const result = sortByDefaultOrder(input);
    expect(result[0].id).toBe('a-id');
  });

  it('places providers with unknown city at the end', () => {
    const input = [make('1', 'Unknown', null), make('2', 'Berlin Restaurant', 'Berlin')];
    const result = sortByDefaultOrder(input);
    expect(result[0].address_city).toBe('Berlin');
    expect(result[1].address_city).toBeNull();
  });

  it('no more than 2 of the first 12 results share the same brand prefix when big cities have diverse providers', () => {
    // Realistic: 9 "Loco Chicken" from small cities, but Berlin has 12 diverse providers
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
    const berlinNames = [
      'Al-Sham',
      'Halal Bros',
      'Kabul Kitchen',
      'Bosporus Grill',
      'Marmara',
      'Al-Nour',
      'Türkis',
      'Shawarma Palace',
      'Kebab House',
      'Al-Madina',
      'Falafel Corner',
      'Istanbul Restaurant',
    ];
    const berlinEntries = berlinNames.map((name, i) => make(`b${i}`, name, 'Berlin'));
    const result = sortByDefaultOrder([...locoEntries, ...berlinEntries]);
    const first12 = result.slice(0, 12);
    const locoCounts = first12.filter((r) => r.name.startsWith('Loco Chicken')).length;
    expect(locoCounts).toBeLessThanOrEqual(2);
  });
});
