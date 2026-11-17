import { describe, expect, it } from 'vitest';
import { toFoodRecentSearches } from '@/features/search/recentSearches';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

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
