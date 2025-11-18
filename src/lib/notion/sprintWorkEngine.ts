/**
 * Sprint work engine - manages automated sprint work execution
 */

import { getSprint } from './sprintHelpers';
import { getPage, updatePage } from './client';
import type { TaskStatus } from './taskHelpers';

export interface SprintItem {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  description: string;
  url: string;
  priority: number; // Lower number = higher priority
}

export interface SprintProgress {
  total: number;
  ready: number;
  inProgress: number;
  done: number;
  notStarted: number;
  completionPercentage: number;
}

/**
 * Get next sprint item to work on (highest priority "Ready" item)
 */
export async function getNextSprintItem(sprintId: string): Promise<SprintItem | null> {
  const sprint = await getSprint(sprintId);
  const issues = sprint.properties.Issues?.relation || [];

  if (issues.length === 0) {
    return null;
  }

  // Fetch all issues and filter for "Ready" status
  const readyItems: SprintItem[] = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i] as { id: string };
    try {
      const page = await getPage(issue.id);
      const status = page.properties.Status?.status?.name || 'Not started';
      
      if (status === 'Ready') {
        const name = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
        const type = page.properties.Type?.select?.name || 'Story';
        
        // Extract description from content blocks
        const description = await extractPageDescription(issue.id);
        
        readyItems.push({
          id: issue.id,
          name,
          type,
          status: status as TaskStatus,
          description,
          url: page.url,
          priority: i, // Position in list = priority (lower = higher priority)
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch issue ${issue.id}:`, error);
    }
  }

  // Sort by priority (lower number = higher priority)
  readyItems.sort((a, b) => a.priority - b.priority);

  return readyItems.length > 0 ? readyItems[0] : null;
}

/**
 * Mark item as in progress
 */
export async function markItemInProgress(itemId: string): Promise<void> {
  await updatePage(itemId, {
    Status: {
      status: {
        name: 'In progress',
      },
    },
  });
}

/**
 * Mark item as done
 */
export async function markItemDone(itemId: string): Promise<void> {
  await updatePage(itemId, {
    Status: {
      status: {
        name: 'Done',
      },
    },
  });
}

/**
 * Get sprint progress
 */
export async function getSprintProgress(sprintId: string): Promise<SprintProgress> {
  const sprint = await getSprint(sprintId);
  const issues = sprint.properties.Issues?.relation || [];

  let total = 0;
  let ready = 0;
  let inProgress = 0;
  let done = 0;
  let notStarted = 0;

  for (const issue of issues) {
    const issueId = (issue as { id: string }).id;
    try {
      const page = await getPage(issueId);
      const status = page.properties.Status?.status?.name || 'Not started';
      total++;
      
      switch (status) {
        case 'Ready':
          ready++;
          break;
        case 'In progress':
          inProgress++;
          break;
        case 'Done':
          done++;
          break;
        default:
          notStarted++;
      }
    } catch (error) {
      console.warn(`Failed to fetch issue ${issueId}:`, error);
    }
  }

  const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    total,
    ready,
    inProgress,
    done,
    notStarted,
    completionPercentage,
  };
}

/**
 * Extract page description from content blocks
 */
async function extractPageDescription(pageId: string): Promise<string> {
  try {
    const { getNotionConfig } = await import('./client');
    const config = getNotionConfig();
    const NOTION_API_BASE = 'https://api.notion.com/v1';
    
    const response = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
      method: 'GET',
      headers: config.headers,
    });
    
    if (!response.ok) {
      return '';
    }
    
    const data = await response.json();
    const blocks = data.results || [];
    
    // Get first few paragraphs as description
    const texts: string[] = [];
    for (const block of blocks.slice(0, 3)) {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        const text = block.paragraph.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      }
    }
    
    return texts.join(' ') || 'No description available';
  } catch {
    return 'No description available';
  }
}

