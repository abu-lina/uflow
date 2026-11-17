import type { WasSelection } from '@/features/search/components/WasCategoryResults';

export function toFoodRecentSearches(entries: WasSelection[]): WasSelection[] {
  return entries
    .filter(
      (entry) =>
        entry.type === 'category' || entry.type === 'dish' || entry.type === 'all-restaurants',
    )
    .slice(0, 3);
}
