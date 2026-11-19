import { describe, expect, it } from 'vitest';
import { applyBrandCap, brandOf } from '@/services/providers/default-order';

const row = (id: string, name: string) => ({ provider_id: id, provider_name: name });

describe('#953 brandOf: brand is the text before " | "', () => {
  it('returns the prefix for "Loco Chicken | Kiel"', () => {
    expect(brandOf('Loco Chicken | Kiel')).toBe('Loco Chicken');
  });

  it('returns the whole trimmed name when there is no separator', () => {
    expect(brandOf('  Mango Grill ')).toBe('Mango Grill');
  });
});

describe('#953 applyBrandCap: no more than 2 of the first 12 share a brand', () => {
  const loco = Array.from({ length: 9 }, (_, i) => row(`l${i}`, `Loco Chicken | City${i}`));
  const others = Array.from({ length: 15 }, (_, i) => row(`o${i}`, `Place ${i}`));
  const input = [...loco, ...others];

  it('keeps at most 2 Loco Chicken entries in the first 12', () => {
    const first12 = applyBrandCap(input).slice(0, 12);
    expect(first12.filter((r) => brandOf(r.provider_name) === 'Loco Chicken')).toHaveLength(2);
  });

  it('keeps input order for the entries it does not defer', () => {
    const first12 = applyBrandCap(input).slice(0, 12);
    expect(first12.map((r) => r.provider_id)).toEqual([
      'l0',
      'l1',
      'o0',
      'o1',
      'o2',
      'o3',
      'o4',
      'o5',
      'o6',
      'o7',
      'o8',
      'o9',
    ]);
  });

  it('keeps the rest in plain input order after the first page', () => {
    const rest = applyBrandCap(input).slice(12);
    expect(rest.map((r) => r.provider_id)).toEqual([
      ...loco.slice(2).map((r) => r.provider_id),
      'o10',
      'o11',
      'o12',
      'o13',
      'o14',
    ]);
  });

  it('returns every entry exactly once', () => {
    const ids = applyBrandCap(input).map((r) => r.provider_id);
    expect(new Set(ids).size).toBe(input.length);
  });

  it('fills the first page from deferred entries when too few other brands exist', () => {
    const only = Array.from({ length: 5 }, (_, i) => row(`l${i}`, `Loco Chicken | C${i}`));
    expect(applyBrandCap(only).map((r) => r.provider_id)).toEqual(['l0', 'l1', 'l2', 'l3', 'l4']);
  });
});
