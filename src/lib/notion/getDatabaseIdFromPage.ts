/**
 * Helper to get database ID from a page's parent information
 */

import { getPage } from './client';

/**
 * Get database ID from a page that belongs to a database
 * 
 * @param pageId - ID of any page in the database
 * @returns The database ID (without dashes, for API use)
 */
export async function getDatabaseIdFromPage(pageId: string): Promise<string | null> {
  try {
    await getPage(pageId);
    
    // For API version 2025-09-03, parent might be data_source_id
    // We need to get the database ID from the data source
    // For now, return null and use known database IDs
    return null;
  } catch (error) {
    console.error('Error getting database ID from page:', error);
    return null;
  }
}

