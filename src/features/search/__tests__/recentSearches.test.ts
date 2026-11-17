import { describe, it, expect } from 'vitest';
import { toFoodRecentSearches } from '../recentSearches';
import type { WasSelection } from '@/features/search/components/WasCategoryResults';

describe('toFoodRecentSearches', () => {
  it('keeps category, dish, and all-restaurants entries', () => {
    const entries: WasSelection[] = [
      { type: 'category', label: 'Kebab', categoryId: 'x', categorySlug: 'kebab' },
      { type: 'dish', label: 'Falafel' },
      { type: 'all-restaurants', label: 'Alle' },
    ];
    expect(toFoodRecentSearches(entries)).toHaveLength(3);
  });

  it('filters out service-type entries', () => {
    const entries: WasSelection[] = [
      { type: 'service-type', label: 'Catering' },
      { type: 'dish', label: 'Falafel' },
    ];
    const result = toFoodRecentSearches(entries);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Falafel');
  });

  it('returns at most 3 entries', () => {
    const entries: WasSelection[] = [
      { type: 'dish', label: 'A' },
      { type: 'dish', label: 'B' },
      { type: 'dish', label: 'C' },
      { type: 'dish', label: 'D' },
    ];
    expect(toFoodRecentSearches(entries)).toHaveLength(3);
  });

  it('returns empty for empty input', () => {
    expect(toFoodRecentSearches([])).toHaveLength(0);
  });
});
