/**
 * Helper functions for creating and updating tasks in Notion Issues database
 */

import { createPageInDataSource, appendContentToPage, updatePage, queryDatabase } from './client';

// Issues database data source ID (from DATABASE_IDS.md)
// Using data source ID directly for API version 2025-09-03
// Must be set via NOTION_ISSUES_DATA_SOURCE_ID environment variable
const ISSUES_DATA_SOURCE_ID = process.env.NOTION_ISSUES_DATA_SOURCE_ID;

if (!ISSUES_DATA_SOURCE_ID) {
  throw new Error(
    'NOTION_ISSUES_DATA_SOURCE_ID environment variable is required. ' +
    'Set it in your .env.local file. See env.template for details.'
  );
}

export type TaskType = 'Story' | 'Task' | 'Bug';
export type TaskStatus = 'Not started' | 'Ready' | 'In progress' | 'Done';
export type TaskDevice = 'Desktop' | 'Mobile';
export type RefinementExpert = 'Backend' | 'Frontend' | 'QA' | 'Security' | 'Compliance' | 'UX/UI';

export interface CreateTaskInput {
  name: string;
  type: TaskType;
  description?: string;
  device?: TaskDevice;
  status?: TaskStatus;
  epicId?: string; // Epic relation
}

export interface UpdateTaskInput {
  name?: string;
  type?: TaskType;
  status?: TaskStatus;
  device?: TaskDevice | TaskDevice[];
  description?: string;
  refinement?: RefinementExpert | RefinementExpert[];
  completedRefinement?: RefinementExpert | RefinementExpert[];
  addRefinement?: RefinementExpert | RefinementExpert[];
  addCompletedRefinement?: RefinementExpert | RefinementExpert[];
}

/**
 * Format properties for Notion API
 */
function formatTaskProperties(input: CreateTaskInput) {
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
    Type: {
      select: {
        name: input.type,
      },
    },
    Status: {
      status: {
        name: input.status || 'Not started',
      },
    },
  };

  // Device is multi-select, so format as array
  if (input.device) {
    properties.Device = {
      multi_select: [
        {
          name: input.device,
        },
      ],
    };
  }

  // Epic relation - link to epic using "Epic" property in Issues table
  if (input.epicId) {
    // Remove dashes from epic ID for Notion API
    const epicIdWithoutDashes = input.epicId.replace(/-/g, '');
    properties.Epic = {
      relation: [
        {
          id: epicIdWithoutDashes,
        },
      ],
    };
  }

  return properties;
}

/**
 * Create a task in the Issues database
 */
export async function createTask(input: CreateTaskInput) {
  const properties = formatTaskProperties(input);

  // Create the page with properties using data source ID
  const page = await createPageInDataSource(ISSUES_DATA_SOURCE_ID as string, properties);

  // Add description as content if provided
  if (input.description) {
    try {
      await appendContentToPage(page.id, input.description);
    } catch (error) {
      // Log but don't fail - page is created, content is optional
      console.warn('Failed to add description to task:', error);
    }
  }

  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
  };
}

/**
 * Format update properties for Notion API
 */
async function formatUpdateProperties(input: UpdateTaskInput) {
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

  if (input.type !== undefined) {
    properties.Type = {
      select: {
        name: input.type,
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

  // Device is multi-select
  if (input.device !== undefined) {
    const devices = Array.isArray(input.device) ? input.device : [input.device];
    properties.Device = {
      multi_select: devices.map((d) => ({ name: d })),
    };
  }

  // Refinement - can be set directly (adding is handled in updateTask)
  if (input.refinement !== undefined) {
    const refinements = Array.isArray(input.refinement) ? input.refinement : [input.refinement];
    properties.Refinement = {
      multi_select: refinements.map((r) => ({ name: r })),
    };
  }
  // Note: addRefinement is handled separately in updateTask to merge with existing

  // Completed Refinement - can be set directly (adding is handled in updateTask)
  if (input.completedRefinement !== undefined) {
    const completed = Array.isArray(input.completedRefinement) ? input.completedRefinement : [input.completedRefinement];
    properties['Completed Refinement'] = {
      multi_select: completed.map((r) => ({ name: r })),
    };
  }
  // Note: addCompletedRefinement is handled separately in updateTask to merge with existing

  // Description - rich_text property (supports markdown formatting like **bold**)
  if (input.description !== undefined) {
    // Parse markdown to rich_text format (handles **bold** text)
    const { parseMarkdownToRichText } = await import('./client');
    const richText = parseMarkdownToRichText(input.description);
    
    properties.Description = {
      rich_text: richText,
    };
  }

  return properties;
}

/**
 * Get current multi-select values from a page
 */
async function getCurrentMultiSelectValues(
  pageId: string,
  propertyName: string
): Promise<string[]> {
  const { getPage } = await import('./client');
  const page = await getPage(pageId);
  const property = page.properties[propertyName];
  
  if (!property || property.type !== 'multi_select') {
    return [];
  }

  return property.multi_select.map((item: { name: string }) => item.name);
}

/**
 * Update a task in the Issues database
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
) {
  // Handle adding to existing multi-select values
  const properties: Record<string, unknown> = {};

  // For refinement, merge with existing if adding
  if (input.addRefinement) {
    const current = await getCurrentMultiSelectValues(taskId, 'Refinement');
    const toAdd = Array.isArray(input.addRefinement) ? input.addRefinement : [input.addRefinement];
    const merged = Array.from(new Set([...current, ...toAdd])); // Remove duplicates
    properties.Refinement = {
      multi_select: merged.map((r) => ({ name: r })),
    };
  }

  // For completed refinement, merge with existing if adding
  if (input.addCompletedRefinement) {
    const current = await getCurrentMultiSelectValues(taskId, 'Completed Refinement');
    const toAdd = Array.isArray(input.addCompletedRefinement) 
      ? input.addCompletedRefinement 
      : [input.addCompletedRefinement];
    const merged = Array.from(new Set([...current, ...toAdd])); // Remove duplicates
    properties['Completed Refinement'] = {
      multi_select: merged.map((r) => ({ name: r })),
    };
  }

  // Add other properties (excluding addRefinement and addCompletedRefinement)
  const otherProperties = await formatUpdateProperties({
    ...input,
    addRefinement: undefined,
    addCompletedRefinement: undefined,
  });
  Object.assign(properties, otherProperties);

  // Update the page
  const page = await updatePage(taskId, properties);

  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
  };
}

/**
 * Get all stories/tasks from the Issues database
 * 
 * @param databaseId - The database ID (not data source ID) for querying
 * @param filter - Optional filter (e.g., by status, type, epic)
 * @param sorts - Optional sort array
 */
export async function getAllStories(
  databaseId?: string,
  filter?: unknown,
  sorts?: Array<{ property: string; direction: 'ascending' | 'descending' }>
) {
  let dbId = databaseId;
  if (!dbId) {
    // Issues database ID from DATABASE_IDS.md
    // URL: https://www.notion.so/2366163f450b80529b2ff97e97f771db
    // Database ID: 2366163f-450b-8052-9b2f-f97e97f771db
    // Notion API needs ID without dashes
    dbId = '2366163f450b80529b2ff97e97f771db';
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

