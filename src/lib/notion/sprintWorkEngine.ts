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
  expertNotes?: string;
  acceptanceCriteria?: string;
  epicInfo?: {
    id: string;
    name: string;
    url: string;
  };
  refinement?: string[]; // Required experts
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

  // Fetch all issues and filter for "Ready" or "Not started" status
  const readyItems: SprintItem[] = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i] as { id: string };
    try {
      const page = await getPage(issue.id);
      const status = page.properties.Status?.status?.name || 'Not started';
      
      // Pick up "Ready" or "Not started" items (skip "In progress" and "Done")
      if (status === 'Ready' || status === 'Not started') {
        const name = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
        const type = page.properties.Type?.select?.name || 'Story';
        
        // Extract full description from content blocks
        const description = await extractPageDescription(issue.id);
        
        // Parse expert notes and acceptance criteria
        const { expertNotes, acceptanceCriteria } = parseExpertNotesAndCriteria(description);
        
        // Get refinement experts
        const refinement = (page.properties as { Refinement?: { multi_select?: Array<{ name: string }> } }).Refinement?.multi_select?.map(r => r.name) || [];
        
        // Get epic information
        const epicInfo = await getEpicInfo(page);
        
        readyItems.push({
          id: issue.id,
          name,
          type,
          status: status as TaskStatus,
          description,
          url: page.url,
          priority: i, // Position in list = priority (lower = higher priority)
          expertNotes: expertNotes || undefined,
          acceptanceCriteria: acceptanceCriteria || undefined,
          epicInfo,
          refinement: refinement.length > 0 ? refinement : undefined,
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
 * Extract page description from content blocks (full content)
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
    
    // Extract all text from blocks
    const texts: string[] = [];
    for (const block of blocks) {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        const text = block.paragraph.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(`# ${text}`);
      } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
        const text = block.heading_2.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(`## ${text}`);
      } else if (block.type === 'heading_3' && block.heading_3?.rich_text) {
        const text = block.heading_3.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(`### ${text}`);
      }
    }
    
    return texts.join('\n\n') || 'No description available';
  } catch {
    return 'No description available';
  }
}

/**
 * Parse expert notes and acceptance criteria from description
 */
function parseExpertNotesAndCriteria(description: string): { expertNotes: string; acceptanceCriteria: string } {
  let expertNotes = '';
  let acceptanceCriteria = '';
  
  // Look for Expert Review Notes section
  const expertNotesMatch = description.match(/\*\*Expert Review Notes\*\*\s*\n\n([\s\S]*?)(?=\*\*Acceptance Criteria\*\*|$)/);
  if (expertNotesMatch) {
    expertNotes = expertNotesMatch[1].trim();
  }
  
  // Look for Acceptance Criteria section
  const criteriaMatch = description.match(/\*\*Acceptance Criteria\*\*\s*\n\n([\s\S]*?)(?=\*\*|$)/);
  if (criteriaMatch) {
    acceptanceCriteria = criteriaMatch[1].trim();
  }
  
  return { expertNotes, acceptanceCriteria };
}

/**
 * Get epic information from task
 */
async function getEpicInfo(page: { properties: unknown }): Promise<{ id: string; name: string; url: string } | undefined> {
  try {
    const epicRelation = (page.properties as { Epic?: { relation?: Array<{ id: string }> } }).Epic?.relation;
    if (!epicRelation || epicRelation.length === 0) {
      return undefined;
    }
    
    const epicId = epicRelation[0].id;
    const { getPage } = await import('./client');
    const epicPage = await getPage(epicId);
    const epicName = epicPage.properties.Name?.title?.[0]?.text?.content || 'Untitled Epic';
    
    return {
      id: epicId,
      name: epicName,
      url: epicPage.url,
    };
  } catch {
    return undefined;
  }
}

/**
 * Get expert rules for a sprint item
 */
export async function getExpertRulesForItem(item: SprintItem): Promise<Map<string, string>> {
  const { readExpertRules } = await import('./epicExpertAnalysis');
  const allExpertRules = readExpertRules();
  
  // Get required experts from item refinement or infer from task
  const requiredExperts = item.refinement || [];
  
  // Filter to only required experts
  const relevantRules = new Map<string, string>();
  for (const expert of requiredExperts) {
    const rule = allExpertRules.get(expert);
    if (rule) {
      relevantRules.set(expert, rule);
    }
  }
  
  return relevantRules;
}

/**
 * Validate implementation against expert rules
 */
export async function validateImplementation(item: SprintItem): Promise<{
  passed: boolean;
  expertValidations: Array<{
    expert: string;
    passed: boolean;
    issues: string[];
  }>;
  overallIssues: string[];
}> {
  const { validateAgainstExpertRules } = await import('./automatedSprintWork');
  const expertRules = await getExpertRulesForItem(item);
  
  // Create a basic implementation result for validation
  // In practice, this would come from the actual implementation
  const implementationResult = {
    success: true,
    filesModified: [],
    errors: [],
    warnings: [],
    implementationSummary: `Implementation for: ${item.name}`,
  };
  
  return await validateAgainstExpertRules(implementationResult, expertRules, item);
}

