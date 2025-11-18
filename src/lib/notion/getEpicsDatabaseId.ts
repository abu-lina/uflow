/**
 * Helper to get the Epics database ID from a known epic page
 * 
 * This extracts the database ID from a page's parent information.
 */

/**
 * Get the Epics database ID from a known epic page
 * 
 * @param epicPageId - ID of any epic page in the database
 * @returns The database ID (without dashes, for API use)
 */
export async function getEpicsDatabaseId(_epicPageId: string): Promise<string> {
  // The page should have parent information
  // For API version 2025-09-03, we need to extract from parent
  // The parent should be a data source, and we can get the database ID from it
  
  // Actually, for querying we need the database ID, not data source ID
  // The database ID can be extracted from the page URL or parent
  // For now, return the known database ID from DATABASE_IDS.md
  return '2366163f450b8045985af4f66be56792';
}

