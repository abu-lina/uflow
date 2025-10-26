// Hardcoded ID for "Gemeinschaft & Spenden" category
const GEMEINSCHAFT_SPENDEN_CATEGORY_ID = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

/**
 * Determines the entity type based on category selection.
 * This could be extended to check the `applicable_to` field in the future.
 */
export function getEntityTypeForCategory(categoryId: string): 'provider' | 'community_service' {
  // For now, we're using a hardcoded ID for "Gemeinschaft & Spenden"
  // In the future, we could fetch the category and check its 'applicable_to' field
  return categoryId === GEMEINSCHAFT_SPENDEN_CATEGORY_ID ? 'community_service' : 'provider';
}

/**
 * Checks if a category should use community service logic
 */
export function isCommunityServiceCategory(categoryId: string): boolean {
  return getEntityTypeForCategory(categoryId) === 'community_service';
}
