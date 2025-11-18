/**
 * Sprint management helpers for Notion
 */

import { createPageInDataSource, updatePage, getPage } from './client';

// Sprints database data source ID (from DATABASE_IDS.md)
// Using data source ID directly for API version 2025-09-03
// Must be set via NOTION_SPRINTS_DATA_SOURCE_ID environment variable
const SPRINTS_DATA_SOURCE_ID = process.env.NOTION_SPRINTS_DATA_SOURCE_ID;

if (!SPRINTS_DATA_SOURCE_ID) {
  throw new Error(
    'NOTION_SPRINTS_DATA_SOURCE_ID environment variable is required. ' +
    'Set it in your .env.local file. See env.template for details.'
  );
}

export type SprintStatus = 'Planning' | 'Active' | 'Completed';

export interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  isException?: boolean; // For this week exception (start today, end Sunday)
}

export interface SprintDates {
  start: Date;
  end: Date;
}

/**
 * Calculate sprint dates (Sunday to Sunday, or exception: today to Sunday)
 */
export function calculateSprintDates(isException: boolean = false): SprintDates {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isException) {
    // Exception: Start today, end next Sunday
    const nextSunday = getNextSunday(today);
    return { start: today, end: nextSunday };
  }

  // Normal: This Sunday to next Sunday
  const thisSunday = getThisSunday(today);
  const nextSunday = getNextSunday(thisSunday);
  return { start: thisSunday, end: nextSunday };
}

/**
 * Get this Sunday (or today if it's Sunday)
 */
function getThisSunday(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysUntilSunday = day === 0 ? 0 : day;
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - daysUntilSunday);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

/**
 * Get next Sunday
 */
function getNextSunday(date: Date): Date {
  const day = date.getDay();
  const daysUntilNextSunday = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(date);
  nextSunday.setDate(date.getDate() + daysUntilNextSunday);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
}

/**
 * Format date for Notion API (ISO date string, date only)
 */
function formatDateForNotion(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Create a sprint
 */
export async function createSprint(input: CreateSprintInput) {
  // Calculate dates
  const dates = input.startDate && input.endDate
    ? { start: new Date(input.startDate), end: new Date(input.endDate) }
    : calculateSprintDates(input.isException);

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
    'Start Date': {
      date: {
        start: formatDateForNotion(dates.start),
      },
    },
    'End Date': {
      date: {
        start: formatDateForNotion(dates.end),
      },
    },
    Status: {
      select: {
        name: 'Planning',
      },
    },
  };

  if (input.goal) {
    properties.Goal = {
      rich_text: [
        {
          text: {
            content: input.goal,
          },
        },
      ],
    };
  }

  const page = await createPageInDataSource(SPRINTS_DATA_SOURCE_ID as string, properties);

  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
    dates,
  };
}

/**
 * Get sprint by ID
 */
export async function getSprint(sprintId: string) {
  const page = await getPage(sprintId);
  return {
    id: page.id,
    url: page.url,
    properties: page.properties,
  };
}

/**
 * Get active sprint
 */
export async function getActiveSprint(): Promise<{ id: string; url: string; properties: unknown } | null> {
  // For now, we'll need to query the database
  // This requires implementing a query function
  // For simplicity, return null and let the API handle querying
  return null;
}

/**
 * Add issues to sprint
 */
export async function addIssuesToSprint(sprintId: string, issueIds: string[]) {
  // Get current sprint
  const sprint = await getSprint(sprintId);
  
  // Get current issues
  const currentIssues = sprint.properties.Issues?.relation || [];
  const currentIssueIds = currentIssues.map((rel: { id: string }) => rel.id);
  
  // Merge with new issues (avoid duplicates)
  const allIssueIds = Array.from(new Set([...currentIssueIds, ...issueIds]));
  
  // Update sprint
  const properties = {
    Issues: {
      relation: allIssueIds.map((id) => ({ id })),
    },
  };

  await updatePage(sprintId, properties);

  return {
    added: issueIds.length,
    total: allIssueIds.length,
  };
}

/**
 * Get sprint issues ordered by priority (rank in Notion)
 */
export async function getSprintIssues(sprintId: string): Promise<Array<{ id: string; name: string; status: string; url: string; priority: number }>> {
  const sprint = await getSprint(sprintId);
  const issues = sprint.properties.Issues?.relation || [];
  
  // Fetch each issue to get details
  const issueDetails: Array<{ id: string; name: string; status: string; url: string; priority: number }> = [];
  
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i] as { id: string };
    try {
      const page = await getPage(issue.id);
      const name = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
      const status = page.properties.Status?.status?.name || 'Not started';
      
      issueDetails.push({
        id: issue.id,
        name,
        status,
        url: page.url,
        priority: i, // Position in list = priority (lower = higher priority)
      });
    } catch (error) {
      console.warn(`Failed to fetch issue ${issue.id}:`, error);
    }
  }
  
  // Already sorted by priority (order in Notion relation)
  return issueDetails;
}

