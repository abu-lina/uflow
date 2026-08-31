import type { WasSelection } from '@/features/search/components/WasCategoryResults';
import { slugify } from '@/lib/slugify';
import { getResultsPathForSection } from '@/config/sectionFilters';
import type { Section } from '@/config/sectionFilters';

/**
 * Build a path-based results URL: /food/[city]/[category]?q=...&filters=...
 */
export function buildResultsUrl(opts: {
  section: Section;
  city?: string | null;
  categorySlug?: string | null;
  query?: string | null;
  filters?: string[];
}): string {
  const { section, city, categorySlug, query, filters } = opts;
  let path = getResultsPathForSection(section);

  if (city) {
    path += `/${slugify(city)}`;
    if (categorySlug) {
      path += `/${categorySlug}`;
    }
  }

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters && filters.length > 0) params.set('filters', filters.join(','));

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildSearchParams(
  selectedWas: WasSelection | null,
  selectedSection: string = 'food'
): URLSearchParams {
  const params = new URLSearchParams();
  if (selectedWas?.type === 'all-restaurants') {
    // No category, no query - show all restaurants
  } else if (selectedWas?.type === 'category' && selectedWas.categoryId) {
    params.set('category', selectedWas.categoryId);
    if (selectedWas.categorySlug) {
      params.set('categorySlug', selectedWas.categorySlug);
    }
  } else if (selectedWas) {
    params.set('q', selectedWas.label);
  }
  return params;
}

/**
 * Build a full results URL from search page selections.
 * Uses path-based routing: /food/[city]/[category-slug]
 */
export function buildSearchResultsUrl(opts: {
  selectedWas: WasSelection | null;
  selectedSection: Section;
  selectedCity?: string | null;
  selectedFilters?: string[];
}): string {
  const { selectedWas, selectedSection, selectedCity, selectedFilters } = opts;

  let categorySlug: string | null = null;
  let query: string | null = null;

  if (selectedWas?.type === 'category' && selectedWas.categoryId) {
    categorySlug = selectedWas.categorySlug ?? slugify(selectedWas.label);
  } else if (selectedWas?.type === 'dish' || selectedWas?.type === 'service-type') {
    query = selectedWas.label;
  }

  return buildResultsUrl({
    section: selectedSection,
    city: selectedCity,
    categorySlug,
    query,
    filters: selectedFilters,
  });
}

export function toFoodRecentSearches(entries: WasSelection[]): WasSelection[] {
  return entries
    .filter((entry) => entry.type === 'category' || entry.type === 'dish' || entry.type === 'all-restaurants')
    .slice(0, 3);
}
