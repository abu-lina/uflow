import type { WasSelection } from '@/features/search/components/WasCategoryResults';

export function buildSearchParams(
  selectedWas: WasSelection | null,
  selectedSection: string = 'food'
): URLSearchParams {
  const params = new URLSearchParams({ section: selectedSection });
  if (selectedWas?.type === 'all-restaurants') {
    // No category, no query — show all restaurants
  } else if (selectedWas?.type === 'category' && selectedWas.categoryId) {
    params.set('category', selectedWas.categoryId);
  } else if (selectedWas) {
    params.set('q', selectedWas.label);
  }
  return params;
}

export function toFoodRecentSearches(entries: WasSelection[]): WasSelection[] {
  return entries
    .filter((entry) => entry.type === 'category' || entry.type === 'dish' || entry.type === 'all-restaurants')
    .slice(0, 3);
}
