/**
 * Notion API client for server-side operations
 * 
 * This client uses the Notion API directly (not MCP) to ensure
 * proper parent database assignment when creating pages.
 * 
 * Updated to support API version 2025-09-03 with data sources.
 */

const NOTION_API_VERSION = '2025-09-03';
const NOTION_API_BASE = 'https://api.notion.com/v1';

/**
 * Get Notion API client configuration
 */
export function getNotionConfig() {
  const notionToken = process.env.NOTION_API_TOKEN;

  if (!notionToken) {
    throw new Error('Missing NOTION_API_TOKEN environment variable');
  }

  return {
    token: notionToken,
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Get data sources from a Notion database
 * 
 * In API version 2025-09-03, databases can have multiple data sources.
 * This function retrieves all data sources for a given database.
 * 
 * @param databaseId - The database ID
 * @returns Array of data sources with id and name
 */
export async function getDatabaseDataSources(databaseId: string) {
  const config = getNotionConfig();

  // Ensure database ID has no dashes for API calls
  const cleanDatabaseId = databaseId.replace(/-/g, '');
  const response = await fetch(`${NOTION_API_BASE}/databases/${cleanDatabaseId}`, {
    method: 'GET',
    headers: config.headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Notion API error: ${error.message || response.statusText}`
    );
  }

  const database = await response.json();
  return database.data_sources || [];
}

/**
 * Get the first (default) data source ID from a database
 * 
 * Helper function to get the primary data source for a database.
 * If multiple data sources exist, returns the first one.
 * 
 * @param databaseId - The database ID
 * @returns The data source ID
 */
export async function getDataSourceId(databaseId: string): Promise<string> {
  const dataSources = await getDatabaseDataSources(databaseId);
  
  if (dataSources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  return dataSources[0].id;
}

/**
 * Create a page in a Notion data source
 * 
 * Note: Content must be added separately using the blocks API
 * This function only creates the page with properties
 * 
 * Updated for API version 2025-09-03 to use data_source_id instead of database_id
 * 
 * @param dataSourceId - The data source ID (not database ID)
 * @param properties - Page properties
 */
export async function createPageInDataSource(
  dataSourceId: string,
  properties: Record<string, unknown>
) {
  const config = getNotionConfig();

  const response = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify({
      parent: {
        type: 'data_source_id',
        data_source_id: dataSourceId,
      },
      properties,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Notion API error: ${error.message || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Create a page in a Notion database (backward compatibility)
 * 
 * This function automatically fetches the data source ID from the database
 * and creates the page in the first data source.
 * 
 * @deprecated Use createPageInDataSource with explicit data source ID for better control
 */
export async function createPageInDatabase(
  databaseId: string,
  properties: Record<string, unknown>
) {
  const dataSourceId = await getDataSourceId(databaseId);
  return createPageInDataSource(dataSourceId, properties);
}

/**
 * Parse markdown text into Notion rich_text format
 * Supports: bold (**text**), plain text
 */
export function parseMarkdownToRichText(text: string): Array<{
  type: 'text';
  text: { content: string };
  annotations?: { bold?: boolean };
}> {
  const richText: Array<{
    type: 'text';
    text: { content: string };
    annotations?: { bold?: boolean };
  }> = [];

  // Regex to match bold text: **text**
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold section
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      if (plainText) {
        richText.push({
          type: 'text',
          text: { content: plainText },
        });
      }
    }

    // Add bold text
    richText.push({
      type: 'text',
      text: { content: match[1] },
      annotations: { bold: true },
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    const plainText = text.substring(lastIndex);
    if (plainText) {
      richText.push({
        type: 'text',
        text: { content: plainText },
      });
    }
  }

  // If no bold text found, return as plain text
  if (richText.length === 0) {
    richText.push({
      type: 'text',
      text: { content: text },
    });
  }

  return richText;
}

/**
 * Append content blocks to a Notion page
 * Supports markdown formatting: headings, bold text, paragraphs
 */
export async function appendContentToPage(
  pageId: string,
  content: string
) {
  const config = getNotionConfig();

  // Remove leading/trailing whitespace and newlines
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return { results: [] };
  }

  // Split content into paragraphs (by double newlines)
  const paragraphs = trimmedContent.split(/\n\n+/).filter(p => p.trim());

  const blocks = paragraphs.map((paragraph) => {
    const trimmed = paragraph.trim();

    // Check if it's a heading
    if (trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^# /, '');
      return {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: parseMarkdownToRichText(headingText),
        },
      };
    }
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^## /, '');
      return {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: parseMarkdownToRichText(headingText),
        },
      };
    }
    if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace(/^### /, '');
      return {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: parseMarkdownToRichText(headingText),
        },
      };
    }

    // Regular paragraph - parse markdown formatting
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parseMarkdownToRichText(trimmed),
      },
    };
  });

  // Notion API blocks endpoint requires page ID without dashes
  // The page.id from API responses is typically without dashes, but handle both cases
  const pageIdWithoutDashes = pageId.replace(/-/g, '');

  const response = await fetch(`${NOTION_API_BASE}/blocks/${pageIdWithoutDashes}/children`, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify({
      children: blocks,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || response.statusText || 'Unknown error';
    console.error(`Failed to append content to page ${pageId}:`, {
      error: errorMessage,
      status: response.status,
      statusText: response.statusText,
      pageId,
      pageIdWithoutDashes,
    });
    throw new Error(
      `Notion API error: ${errorMessage}`
    );
  }

  return response.json();
}

/**
 * Update a Notion page
 */
export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>
) {
  const config = getNotionConfig();

  // Remove dashes from page ID for Notion API
  const pageIdWithoutDashes = pageId.replace(/-/g, '');

  const response = await fetch(`${NOTION_API_BASE}/pages/${pageIdWithoutDashes}`, {
    method: 'PATCH',
    headers: config.headers,
    body: JSON.stringify({
      properties,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || response.statusText || 'Unknown error';
    console.error(`Failed to update page ${pageId}:`, {
      error: errorMessage,
      status: response.status,
      statusText: response.statusText,
      pageId,
      pageIdWithoutDashes,
    });
    throw new Error(
      `Notion API error: ${errorMessage}`
    );
  }

  return response.json();
}

/**
 * Get a Notion page
 */
export async function getPage(pageId: string) {
  const config = getNotionConfig();

  // Remove dashes from page ID for Notion API
  const pageIdWithoutDashes = pageId.replace(/-/g, '');

  const response = await fetch(`${NOTION_API_BASE}/pages/${pageIdWithoutDashes}`, {
    method: 'GET',
    headers: config.headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || response.statusText || 'Unknown error';
    throw new Error(
      `Notion API error: ${errorMessage}`
    );
  }

  return response.json();
}

/**
 * Query a Notion database
 * 
 * For API version 2025-09-03, queries must use data source IDs instead of database IDs.
 * This function automatically gets the data source ID from the database ID.
 * 
 * @param databaseId - The database ID to query (will be converted to data source ID)
 * @param filter - Optional filter object
 * @param sorts - Optional sort array
 * @param pageSize - Optional page size (default: 100, max: 100)
 */
export async function queryDatabase(
  databaseId: string,
  filter?: unknown,
  sorts?: Array<{ property: string; direction: 'ascending' | 'descending' }>,
  pageSize: number = 100
) {
  const config = getNotionConfig();

  // For API 2025-09-03, we need to use data source ID for queries
  // Get the data source ID from the database ID
  const dataSourceId = await getDataSourceId(databaseId);

  const body: Record<string, unknown> = {
    page_size: Math.min(pageSize, 100),
  };

  if (filter) {
    body.filter = filter;
  }

  if (sorts && sorts.length > 0) {
    body.sorts = sorts;
  }

  // Use data source ID for querying (API 2025-09-03 requirement)
  // Data source IDs should have dashes
  const url = `${NOTION_API_BASE}/data_sources/${dataSourceId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: config.headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || response.statusText || 'Unknown error';
    console.error(`Failed to query database ${databaseId} (data source ${dataSourceId}):`, {
      error: errorMessage,
      status: response.status,
      statusText: response.statusText,
      url,
      databaseId,
      dataSourceId,
      filter,
      sorts,
    });
    throw new Error(
      `Notion API error: ${errorMessage}`
    );
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get a Notion database (schema)
 */
export async function getDatabase(databaseId: string) {
  const config = getNotionConfig();

  // Remove dashes from database ID for Notion API
  const cleanDatabaseId = databaseId.replace(/-/g, '');

  const response = await fetch(`${NOTION_API_BASE}/databases/${cleanDatabaseId}`, {
    method: 'GET',
    headers: config.headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const errorMessage = error.message || response.statusText || 'Unknown error';
    throw new Error(
      `Notion API error: ${errorMessage}`
    );
  }

  return response.json();
}
