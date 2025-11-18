/**
 * Helper functions for creating and managing Epics in Notion
 */

import { createPageInDataSource, appendContentToPage, updatePage, getPage, queryDatabase } from './client';

// Epics database data source ID (from DATABASE_IDS.md)
// Using data source ID directly for API version 2025-09-03
// Must be set via NOTION_EPICS_DATA_SOURCE_ID environment variable
const EPICS_DATA_SOURCE_ID = process.env.NOTION_EPICS_DATA_SOURCE_ID;

if (!EPICS_DATA_SOURCE_ID) {
  throw new Error(
    'NOTION_EPICS_DATA_SOURCE_ID environment variable is required. ' +
    'Set it in your .env.local file. See env.template for details.'
  );
}

export type MoSCoW = 'Must have' | 'Should have' | 'Could have' | "Won't have";
export type EpicStatus = 'Not started' | 'In progress' | 'Done';

export interface CreateEpicInput {
  name: string;
  description?: string;
  moscow?: MoSCoW;
  status?: EpicStatus;
  rank?: number; // Rank 1 = highest priority (top of table)
  targetDelivery?: string; // ISO date string
  labels?: string[];
}

export interface UpdateEpicInput {
  name?: string;
  description?: string;
  moscow?: MoSCoW;
  status?: EpicStatus;
  rank?: number; // Rank 1 = highest priority (top of table)
  targetDelivery?: string;
  labels?: string[];
}

/**
 * Format properties for Epic creation
 */
function formatEpicProperties(input: CreateEpicInput) {
  const properties: Record<string, unknown> = {
    Name: {
      title: [
        {
          text: {
            content: input.name,
          },
        },
      ],
    },
  };

  if (input.moscow) {
    properties.MoSCoW = {
      select: {
        name: input.moscow,
      },
    };
  }

  if (input.status) {
    properties.Status = {
      status: {
        name: input.status,
      },
    };
  }

  if (input.rank !== undefined) {
    properties.Rank = {
      number: input.rank,
    };
  }

  if (input.targetDelivery) {
    properties['Target Delivery'] = {
      date: {
        start: input.targetDelivery,
      },
    };
  }

  if (input.labels && input.labels.length > 0) {
    properties.Labels = {
      multi_select: input.labels.map((label) => ({ name: label })),
    };
  }

  if (input.description) {
    properties.Description = {
      rich_text: [
        {
          text: {
            content: input.description,
          },
        },
      ],
    };
  }

  return properties;
}

/**
 * Create an epic in the Epics database
 */
export async function createEpic(input: CreateEpicInput) {
  const properties = formatEpicProperties(input);

  // Create the page with properties
  const page = await createPageInDataSource(EPICS_DATA_SOURCE_ID as string, properties);

  // Add description as content if provided
  if (input.description) {
    try {
      await appendContentToPage(page.id, input.description as string);
    } catch (error) {
      console.warn('Failed to add description to epic:', error);
    }
  }

  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
  };
}

/**
 * Get an epic by ID
 */
export async function getEpic(epicId: string) {
  const page = await getPage(epicId);
  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
    content: page.content,
  };
}

/**
 * Update an epic
 */
export async function updateEpic(epicId: string, input: UpdateEpicInput) {
  const properties: Record<string, unknown> = {};

  if (input.name !== undefined) {
    properties.Name = {
      title: [
        {
          text: {
            content: input.name,
          },
        },
      ],
    };
  }

  if (input.moscow !== undefined) {
    properties.MoSCoW = {
      select: {
        name: input.moscow,
      },
    };
  }

  if (input.status !== undefined) {
    properties.Status = {
      status: {
        name: input.status,
      },
    };
  }

  if (input.rank !== undefined) {
    properties.Rank = {
      number: input.rank,
    };
  }

  if (input.targetDelivery !== undefined) {
    properties['Target Delivery'] = {
      date: {
        start: input.targetDelivery,
      },
    };
  }

  if (input.labels !== undefined) {
    properties.Labels = {
      multi_select: input.labels.map((label) => ({ name: label })),
    };
  }

  if (input.description !== undefined) {
    properties.Description = {
      rich_text: [
        {
          text: {
            content: input.description,
          },
        },
      ],
    };
  }

  const page = await updatePage(epicId, properties);

  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
  };
}

/**
 * Get all epics from the Epics database
 * 
 * Note: This requires the database ID (not data source ID) for querying.
 * You can get it from the database URL or use getDatabaseDataSources.
 */
export async function getAllEpics(
  databaseId?: string,
  filter?: unknown,
  sorts?: Array<{ property: string; direction: 'ascending' | 'descending' }>
) {
  // If database ID not provided, use default from DATABASE_IDS.md
  let dbId = databaseId;
  if (!dbId) {
    // Epics database ID from DATABASE_IDS.md
    // URL: https://www.notion.so/2366163f450b8045985af4f66be56792
    // Database ID: 2366163f450b8045985af4f66be56792 (without dashes)
    dbId = '2366163f450b8045985af4f66be56792';
  }

  // Remove dashes if present (Notion API format)
  dbId = dbId.replace(/-/g, '');

  const results = await queryDatabase(dbId, filter, sorts);
  
  return results.map((page: { id: string; url: string; properties: unknown }) => ({
    id: page.id,
    url: page.url,
    properties: page.properties,
  }));
}

