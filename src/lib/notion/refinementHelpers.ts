/**
 * Automatic refinement logic for Notion tasks
 * Analyzes task content and determines required experts
 */

import { getPage, updatePage } from './client';
import type { RefinementExpert } from './taskHelpers';
import { readExpertRules, extractResponsibilities } from './epicExpertAnalysis';

interface RefinementResult {
  requiredExperts: RefinementExpert[];
  notes: Record<RefinementExpert, string>;
  acceptanceCriteria: string[];
}

/**
 * Extract review criteria from expert rule
 */
function extractReviewCriteria(ruleContent: string): string[] {
  const criteria: string[] = [];
  const criteriaMatch = ruleContent.match(/## Review Criteria\s*\n\s*### Must Check\s*\n([\s\S]*?)(?=###|##|$)/i);
  
  if (criteriaMatch) {
    const lines = criteriaMatch[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && (trimmed.startsWith('1.') || trimmed.startsWith('-') || trimmed.startsWith('*'))) {
        const clean = trimmed.replace(/^[1-9]\.\s*/, '').replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
        if (clean) criteria.push(clean);
      }
    }
  }
  
  return criteria;
}

/**
 * Generate expert-specific notes based on task content and expert rules
 */
function generateExpertNotes(
  expertName: RefinementExpert,
  expertRule: string,
  taskName: string,
  taskDescription: string,
  _taskType: 'Story' | 'Task' | 'Bug'
): string {
  const content = `${taskName} ${taskDescription}`.toLowerCase();
  const responsibilities = extractResponsibilities(expertRule);
  const reviewCriteria = extractReviewCriteria(expertRule);
  
  const notes: string[] = [];
  
  // Add relevant responsibilities based on task content
  const relevantResponsibilities = responsibilities.filter(resp => {
    const respLower = resp.toLowerCase();
    return content.includes(respLower) || 
           content.includes(respLower.split(' ')[0]) ||
           (expertName === 'QA' && (respLower.includes('acceptance') || respLower.includes('test') || respLower.includes('quality')));
  });
  
  if (relevantResponsibilities.length > 0) {
    notes.push(`Review required for: ${relevantResponsibilities.slice(0, 3).join(', ')}.`);
  } else if (expertName === 'QA') {
    // QA always has responsibilities even if not explicitly matched
    notes.push('Review required for: acceptance criteria, test scenarios, quality requirements.');
  }
  
  // Add review criteria that are relevant
  if (reviewCriteria.length > 0) {
    const relevantCriteria = reviewCriteria.slice(0, 2);
    notes.push(`Must check: ${relevantCriteria.join('; ')}.`);
  }
  
  // Expert-specific guidance (always add for QA)
  switch (expertName) {
    case 'QA':
      notes.push('Define acceptance criteria using Given-When-Then format.');
      notes.push('Specify test scenarios (happy path, edge cases, errors).');
      notes.push('Review quality requirements (performance, accessibility, browser compatibility).');
      break;
    case 'Compliance':
      if (content.includes('data') || content.includes('privacy') || content.includes('user')) {
        notes.push('Review data collection, processing legal basis, and user rights implementation.');
      }
      break;
    case 'Security':
      if (content.includes('auth') || content.includes('login') || content.includes('admin')) {
        notes.push('Review authentication/authorization mechanisms, input validation, and API security.');
      }
      break;
    case 'Backend':
      if (content.includes('api') || content.includes('database') || content.includes('endpoint')) {
        notes.push('Review API design, database schema changes, query performance, and error handling.');
      }
      break;
    case 'Frontend':
      if (content.includes('component') || content.includes('ui') || content.includes('page')) {
        notes.push('Review component structure, accessibility, responsive design, and loading/error states.');
      }
      break;
    case 'UX/UI':
      if (content.includes('design') || content.includes('ui') || content.includes('user')) {
        notes.push('Review design system consistency, user flow, accessibility, and motion design.');
      }
      break;
  }
  
  // Ensure QA always has content
  if (expertName === 'QA' && notes.length === 0) {
    notes.push('Review required for: acceptance criteria, test scenarios, quality requirements.');
    notes.push('Define acceptance criteria using Given-When-Then format.');
    notes.push('Specify test scenarios (happy path, edge cases, errors).');
  }
  
  return notes.join(' ') || `${expertName} review required based on task requirements.`;
}

/**
 * Generate acceptance criteria based on task content and expert rules
 */
function generateAcceptanceCriteria(
  requiredExperts: RefinementExpert[],
  expertRules: Map<string, string>,
  taskName: string,
  taskDescription: string,
  taskType: 'Story' | 'Task' | 'Bug'
): string[] {
  const criteria: string[] = [];
  const content = `${taskName} ${taskDescription}`;
  const contentLower = content.toLowerCase();
  
  // QA always provides acceptance criteria (check both 'QA' and 'Qa' for expert rule)
  const qaRule = expertRules.get('QA') || expertRules.get('Qa');
  if (qaRule && requiredExperts.includes('QA')) {
    // Generate Given-When-Then format acceptance criteria based on task content
    const context = extractContext(content);
    const userAction = extractUserAction(content) || extractActionFromTaskName(taskName, taskDescription);
    const expectedOutcome = extractExpectedOutcome(content) || extractOutcomeFromTaskName(taskName, taskDescription);
    
    // Always generate Given-When-Then format
    criteria.push(`**Given-When-Then Format:**`);
    let givenClause = 'the system is ready';
    if (context !== 'the application' && context !== 'application') {
      givenClause = `a user is on ${context.startsWith('the ') ? context : `the ${context}`}`;
    } else if (contentLower.includes('admin panel')) {
      givenClause = 'a user is on the admin panel';
    } else if (contentLower.includes('provider')) {
      givenClause = 'a user is on the provider management section';
    }
    criteria.push(`Given ${givenClause}`);
    
    if (userAction) {
      criteria.push(`When ${userAction}`);
    } else {
      criteria.push(`When the ${taskType.toLowerCase()} "${taskName}" is implemented`);
    }
    
    if (expectedOutcome) {
      criteria.push(`Then ${expectedOutcome}`);
    } else {
      criteria.push(`Then the feature works as specified and meets all requirements`);
    }
    
    criteria.push(`And all acceptance criteria are verified`);
    
    // Add test scenario requirements
    criteria.push(`\n**Test Scenarios Required:**`);
    criteria.push(`- Happy path: User successfully completes the primary flow`);
    criteria.push(`- Edge cases: Handle boundary conditions and unusual inputs`);
    criteria.push(`- Error scenarios: Graceful error handling and user feedback`);
  }
  
  // Add expert-specific acceptance criteria
  for (const expert of requiredExperts) {
    if (expert === 'QA') continue; // Already handled above
    
    const expertRule = expertRules.get(expert);
    if (!expertRule) continue;
    
    const responsibilities = extractResponsibilities(expertRule);
    const relevantResponsibilities = responsibilities.filter(resp => {
      const respLower = resp.toLowerCase();
      return contentLower.includes(respLower) || 
             contentLower.includes(respLower.split(' ')[0]);
    });
    
    if (relevantResponsibilities.length > 0) {
      criteria.push(`\n**${expert} Requirements:**`);
      for (const resp of relevantResponsibilities.slice(0, 3)) {
        criteria.push(`- ${resp} must be implemented and verified`);
      }
    }
  }
  
  // Add quality requirements (always from QA perspective)
  if (requiredExperts.includes('QA')) {
    criteria.push(`\n**Quality Requirements:**`);
    criteria.push(`- Performance: Page load <2s, API response <500ms`);
    criteria.push(`- Accessibility: WCAG 2.1 Level AA compliance`);
    criteria.push(`- Browser compatibility: Chrome, Firefox, Safari, Edge (latest 2 versions)`);
  }
  
  return criteria;
}

/**
 * Extract user action from task description
 */
function extractUserAction(content: string): string | null {
  const actionPatterns = [
    /(?:user|admin|they)\s+(?:can|should|will|must)\s+([^.!?]+)/i,
    /(?:allows?|enables?)\s+([^.!?]+)/i,
    /(?:click|select|enter|submit|view|access|create|update|delete)\s+([^.!?]+)/i,
  ];
  
  for (const pattern of actionPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  
  return null;
}

/**
 * Extract expected outcome from task description
 */
function extractExpectedOutcome(content: string): string | null {
  const outcomePatterns = [
    /(?:then|result|outcome|should|will)\s+([^.!?]+)/i,
    /(?:displays?|shows?|shows?)\s+([^.!?]+)/i,
    /(?:redirects?|navigates?)\s+([^.!?]+)/i,
  ];
  
  for (const pattern of outcomePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  
  return null;
}

/**
 * Extract context (page/feature) from task description
 */
function extractContext(content: string): string {
  const contentLower = content.toLowerCase();
  
  // Check for common contexts first (most specific)
  if (contentLower.includes('admin panel')) {
    return 'the admin panel';
  }
  if (contentLower.includes('provider')) {
    return 'the provider management section';
  }
  
  // Try pattern matching
  const contextPatterns = [
    /(?:on|in|at)\s+(?:the\s+)?([a-z\s]+?)\s+(?:page|screen|view|panel|modal|form)/i,
    /(?:page|screen|view|panel|modal|form)\s+(?:for|of)\s+([a-z\s]+)/i,
    /(?:admin\s+)?panel\s+(?:for|to)\s+([a-z\s]+)/i,
  ];
  
  for (const pattern of contextPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim().toLowerCase();
      // Avoid extracting partial phrases like "for admin"
      if (extracted.length > 3 && !extracted.startsWith('for ') && !extracted.startsWith('to ')) {
        return `the ${extracted}`;
      }
    }
  }
  
  return 'the application';
}

/**
 * Extract action from task name/description when patterns don't match
 */
function extractActionFromTaskName(taskName: string, taskDescription: string): string | null {
  const combined = `${taskName} ${taskDescription}`.toLowerCase();
  
  // Common action patterns
  if (combined.includes('review') || combined.includes('approve')) {
    return 'they review and approve the item';
  }
  if (combined.includes('create') || combined.includes('add')) {
    return 'they create a new item';
  }
  if (combined.includes('update') || combined.includes('edit')) {
    return 'they update the item';
  }
  if (combined.includes('delete') || combined.includes('remove')) {
    return 'they delete the item';
  }
  if (combined.includes('view') || combined.includes('see') || combined.includes('display')) {
    return 'they view the information';
  }
  if (combined.includes('protect') || combined.includes('data protection')) {
    return 'they access or process data';
  }
  
  return null;
}

/**
 * Extract outcome from task name/description when patterns don't match
 */
function extractOutcomeFromTaskName(taskName: string, taskDescription: string): string | null {
  const combined = `${taskName} ${taskDescription}`.toLowerCase();
  
  // Common outcome patterns
  if (combined.includes('data protection') || combined.includes('compliance')) {
    return 'data protection requirements are met and compliance is ensured';
  }
  if (combined.includes('review') || combined.includes('approve')) {
    return 'the item is reviewed and approved according to the workflow';
  }
  if (combined.includes('create') || combined.includes('add')) {
    return 'the item is created successfully';
  }
  if (combined.includes('update') || combined.includes('edit')) {
    return 'the item is updated successfully';
  }
  if (combined.includes('delete') || combined.includes('remove')) {
    return 'the item is deleted successfully';
  }
  if (combined.includes('view') || combined.includes('see') || combined.includes('display')) {
    return 'the information is displayed correctly';
  }
  
  return null;
}

/**
 * Analyze task content to determine required experts
 */
export function analyzeTaskContent(
  taskName: string,
  taskDescription: string,
  taskType: 'Story' | 'Task' | 'Bug'
): RefinementResult {
  const content = `${taskName} ${taskDescription}`.toLowerCase();
  const requiredExperts: RefinementExpert[] = [];
  const notes: Record<RefinementExpert, string> = {
    Backend: '',
    Frontend: '',
    QA: '',
    Security: '',
    Compliance: '',
    'UX/UI': '',
  };

  // QA is always required (note will be generated from expert rules later)
  requiredExperts.push('QA');

  // Analyze keywords for expert selection
  const keywords = {
    Security: [
      'auth', 'authentication', 'authorization', 'login', 'logout', 'session',
      'token', 'password', 'credential', 'permission', 'role', 'access control',
      'encrypt', 'decrypt', 'secure', 'vulnerability', 'csrf', 'xss', 'sql injection'
    ],
    Compliance: [
      'gdpr', 'privacy', 'data protection', 'personal data', 'pii',
      'consent', 'cookie', 'user rights', 'data retention', 'data deletion',
      'data export', 'privacy policy', 'terms of service'
    ],
    Backend: [
      'api', 'endpoint', 'route', 'database', 'query', 'migration', 'schema',
      'server', 'backend', 'supabase', 'postgres', 'sql', 'service',
      'integration', 'webhook', 'background job', 'cron'
    ],
    Frontend: [
      'component', 'ui', 'page', 'route', 'client', 'react', 'hook',
      'state', 'form', 'input', 'button', 'modal', 'dialog'
    ],
    'UX/UI': [
      'design', 'ui', 'ux', 'user experience', 'interface', 'layout',
      'responsive', 'mobile', 'desktop', 'accessibility', 'aria',
      'keyboard', 'screen reader', 'figma', 'animation', 'motion'
    ],
  };

  // Check for keyword matches
  for (const [expert, keywordList] of Object.entries(keywords)) {
    const matches = keywordList.filter(keyword => content.includes(keyword));
    if (matches.length > 0) {
      const expertType = expert as RefinementExpert;
      if (!requiredExperts.includes(expertType)) {
        requiredExperts.push(expertType);
      }
      notes[expertType] = `Identified keywords: ${matches.slice(0, 3).join(', ')}. Review required.`;
    }
  }

  // Task type-based defaults
  if (taskType === 'Story') {
    // Stories typically need both backend and frontend
    if (!requiredExperts.includes('Backend') && !content.includes('frontend only')) {
      requiredExperts.push('Backend');
      notes.Backend = 'Story likely requires backend API or data layer.';
    }
    if (!requiredExperts.includes('Frontend')) {
      requiredExperts.push('Frontend');
      notes.Frontend = 'Story requires frontend implementation.';
    }
    if (!requiredExperts.includes('UX/UI')) {
      requiredExperts.push('UX/UI');
      notes['UX/UI'] = 'Story requires UX/UI review for user experience.';
    }
  } else if (taskType === 'Task') {
    // Tasks are more specific - determine based on content
    if (content.includes('api') || content.includes('database') || content.includes('backend')) {
      if (!requiredExperts.includes('Backend')) {
        requiredExperts.push('Backend');
        notes.Backend = 'Task involves backend work.';
      }
    }
    if (content.includes('component') || content.includes('ui') || content.includes('page')) {
      if (!requiredExperts.includes('Frontend')) {
        requiredExperts.push('Frontend');
        notes.Frontend = 'Task involves frontend work.';
      }
    }
  }

  // Read expert rules and generate real notes and acceptance criteria
  const expertRules = readExpertRules();
  const acceptanceCriteria: string[] = [];
  
  // Generate expert-specific notes based on rules
  for (const expert of requiredExperts) {
    // Try both exact match and case variations
    let expertRule = expertRules.get(expert);
    if (!expertRule) {
      // Try case variations
      const expertLower = expert.toLowerCase();
      for (const [key, value] of Array.from(expertRules.entries())) {
        if (key.toLowerCase() === expertLower) {
          expertRule = value;
          break;
        }
      }
    }
    
    if (expertRule) {
      const generatedNote = generateExpertNotes(expert, expertRule, taskName, taskDescription, taskType);
      notes[expert] = generatedNote || notes[expert] || `${expert} review required based on task requirements.`;
    } else {
      // Fallback if expert rule not found
      if (expert === 'QA') {
        notes[expert] = 'Review required for: acceptance criteria, test scenarios, quality requirements. Define acceptance criteria using Given-When-Then format. Specify test scenarios (happy path, edge cases, errors).';
      } else {
        notes[expert] = notes[expert] || `${expert} review required based on task requirements.`;
      }
    }
  }
  
  // Generate acceptance criteria based on expert rules
  const generatedCriteria = generateAcceptanceCriteria(
    requiredExperts,
    expertRules,
    taskName,
    taskDescription,
    taskType
  );
  acceptanceCriteria.push(...generatedCriteria);

  return {
    requiredExperts,
    notes,
    acceptanceCriteria,
  };
}

/**
 * Refine a task automatically
 */
export async function refineTask(taskId: string): Promise<RefinementResult> {
  // Remove dashes from task ID for Notion API
  const taskIdWithoutDashes = taskId.replace(/-/g, '');

  // Fetch task from Notion
  const page = await getPage(taskIdWithoutDashes);
  
  // Extract task properties
  const name = page.properties.Name?.title?.[0]?.text?.content || '';
  const type = page.properties.Type?.select?.name || 'Story';
  // Use the page ID from API response (it's already in the correct format)
  const description = await extractPageContent(page.id);

  // Analyze content
  const result = analyzeTaskContent(
    name,
    description,
    type as 'Story' | 'Task' | 'Bug'
  );

  // Update task with refinement
  const refinementProperty = {
    Refinement: {
      multi_select: result.requiredExperts.map((expert) => ({ name: expert })),
    },
  };

  await updatePage(taskIdWithoutDashes, refinementProperty);

  // Add expert notes to task Description field
  const notesText = Array.from(Object.entries(result.notes))
    .filter(([expert]) => result.requiredExperts.includes(expert as RefinementExpert))
    .map(([expert, note]) => `**${expert}**: ${note}`)
    .join('\n\n');

  // Format acceptance criteria
  const acceptanceCriteriaText = result.acceptanceCriteria.join('\n');

  // Build the complete description content
  const descriptionParts: string[] = [];
  
  if (notesText) {
    descriptionParts.push(`**Expert Review Notes**\n\n${notesText}`);
  }
  
  // Always add Acceptance Criteria section with real content
  descriptionParts.push(`**Acceptance Criteria**\n\n${acceptanceCriteriaText}`);
  
  const descriptionContent = descriptionParts.join('\n\n');

  if (descriptionContent) {
    try {
      // Update Description property using updateTask
      const { updateTask } = await import('./taskHelpers');
      await updateTask(taskId, {
        description: descriptionContent,
      });
    } catch (error) {
      console.error(`Failed to add expert notes to task Description ${taskId}:`, {
        error: error instanceof Error ? error.message : String(error),
        taskId,
        taskIdWithoutDashes,
        pageId: page.id,
        notesText,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - refinement succeeded, notes are optional
    }
  }

  return result;
}

/**
 * Extract page content as text
 */
async function extractPageContent(pageId: string): Promise<string> {
  try {
    const { getNotionConfig } = await import('./client');
    const config = getNotionConfig();
    const NOTION_API_BASE = 'https://api.notion.com/v1';
    
    // Remove dashes from page ID for Notion API
    const pageIdWithoutDashes = pageId.replace(/-/g, '');
    
    // Fetch page blocks
    const response = await fetch(`${NOTION_API_BASE}/blocks/${pageIdWithoutDashes}/children`, {
      method: 'GET',
      headers: config.headers,
    });
    
    if (!response.ok) {
      return '';
    }
    
    const data = await response.json();
    const blocks = data.results || [];
    
    // Extract text from blocks
    const texts: string[] = [];
    for (const block of blocks) {
      if (block.type === 'paragraph' && block.paragraph?.rich_text) {
        const text = block.paragraph.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
        const text = block.heading_1.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
        const text = block.heading_2.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      } else if (block.type === 'heading_3' && block.heading_3?.rich_text) {
        const text = block.heading_3.rich_text.map((rt: { plain_text: string }) => rt.plain_text).join('');
        if (text) texts.push(text);
      }
    }
    
    return texts.join(' ');
  } catch {
    return '';
  }
}

