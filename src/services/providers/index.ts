/**
 * Provider data access module.
 *
 * All provider-related queries, types, and helpers are consolidated here.
 * Callers import from `@/services/providers` — the barrel re-exports everything
 * the old monolith exported, so existing import sites work unchanged.
 */

// Types & transform
export type {
  FoodMenuItem,
  NearMeFoodResult,
  Provider,
  SearchResult,
  ReviewStatusFilter,
  AdminSearchOptions,
  PopularCity,
} from './types';
export { transformProviderToSearchResult } from './types';

// Near-me
export { searchFoodNearMe } from './near-me';

// Search
export { searchProvidersAndCommunityServices, searchProviders } from './search';

// CRUD
export {
  getProviders,
  getProviderById,
  getProviderCount,
  getCreatedProviders,
  getRecommendations,
  getRecentApprovedProviders,
} from './crud';

// Cities
export {
  fetchAllValidCities,
  checkCityExists,
  fetchProviderCities,
  fetchPopularCities,
  fetchFilteredCities,
} from './cities';

// Bookmarks
export { getAllBookmarkedItems, fetchBookmarkedCities } from './bookmarks';

// Suggestions (typeahead)
export { fetchSearchSuggestions } from './suggestions';
export type { SearchSuggestion } from './suggestions';

// Map pins
export { getMapLocations } from './map-pins';
export type { RawLocationRow, RawProviderRow, RawCategoryRow } from './map-pins';
