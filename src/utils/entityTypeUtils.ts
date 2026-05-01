/**
 * Determines the entity type based on category selection.
 * M-5a: community_service entity type removed — all entities are 'provider'.
 * Ummah providers use listing_type='ummah' instead.
 */
export function getEntityTypeForCategory(_categoryId: string): 'provider' {
  return 'provider';
}

/**
 * Checks if a category should use community service logic
 * M-5a: always returns false — ummah providers use listing_type='ummah'
 */
export function isCommunityServiceCategory(_categoryId: string): boolean {
  return false;
}
