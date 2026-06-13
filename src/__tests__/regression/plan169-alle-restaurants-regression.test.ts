import { describe, expect, it } from 'vitest';
import { buildSearchParams, toFoodRecentSearches } from '@/lib/search-params';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

describe('Plan 169 — buildSearchParams URL-param logic', () => {
  it('all-restaurants type sets no category or q param [post-fix PASSES]', () => {
    const params = buildSearchParams({
      type: 'all-restaurants',
      label: 'Alle Restaurants',
    });
    const str = params.toString();
    expect(str).not.toContain('category=');
    expect(str).not.toContain('q=');
    expect(params.get('section')).toBe('food');
  });

  it('category with categoryId sets category param [post-fix PASSES]', () => {
    const params = buildSearchParams({
      type: 'category',
      label: 'Turkisch',
      categoryId: '1',
    });
    expect(params.get('category')).toBe('1');
    expect(params.get('q')).toBeNull();
    expect(params.get('section')).toBe('food');
  });

  it('dish type sets q param with label [post-fix PASSES]', () => {
    const params = buildSearchParams({
      type: 'dish',
      label: 'Pizza',
    });
    expect(params.get('q')).toBe('Pizza');
    expect(params.get('category')).toBeNull();
    expect(params.get('section')).toBe('food');
  });
});

describe('Plan 169 — toFoodRecentSearches all-restaurants filter', () => {
  it('keeps all-restaurants entries in recent searches [post-fix PASSES]', () => {
    const input: WasSelection[] = [
      { type: 'all-restaurants', label: 'Alle Restaurants' },
      { type: 'category', label: 'Turkisch', categoryId: '1' },
    ];
    const result = toFoodRecentSearches(input);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('all-restaurants');
    expect(result[1].type).toBe('category');
  });

  it('filters unknown types [post-fix behavioral]', () => {
    const input: WasSelection[] = [
      { type: 'unknown-type', label: 'Bogus' } as unknown as WasSelection,
    ];
    const result = toFoodRecentSearches(input);
    expect(result).toHaveLength(0);
  });
});
