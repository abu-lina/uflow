/**
 * Expert-driven epic analysis - uses expert rules to analyze epics and generate stories/tasks
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { RefinementExpert } from './taskHelpers';

export interface ExpertAnalysisItem {
  name: string;
  type: 'Story' | 'Task';
  description: string;
  requiredExperts: RefinementExpert[];
  expertNotes: string;
  device?: 'Desktop' | 'Mobile';
}

export interface ExpertAnalysisResult {
  expert: string;
  items: ExpertAnalysisItem[];
}

export interface EpicData {
  name: string;
  description: string;
  properties: Record<string, unknown>;
}

/**
 * Read expert rule files from .cursor/rules directory
 */
export function readExpertRules(): Map<string, string> {
  const rulesDir = join(process.cwd(), '.cursor', 'rules');
  const expertRules = new Map<string, string>();

  try {
    const files = readdirSync(rulesDir);
    const expertFiles = files.filter(
      (file) => file.endsWith('-expert.mdc') && file !== 'architecture-expert.mdc'
    );

    for (const file of expertFiles) {
      // Map file names to expert names
      let expertName = file.replace('-expert.mdc', '');
      // Convert kebab-case to proper name
      if (expertName === 'ux-ui') {
        expertName = 'UX/UI';
      } else {
        expertName = expertName
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      const filePath = join(rulesDir, file);
      const content = readFileSync(filePath, 'utf-8');
      expertRules.set(expertName, content);
    }
  } catch (error) {
    console.warn('Failed to read expert rules:', error);
  }

  return expertRules;
}

/**
 * Analyze epic with a specific expert and generate domain-specific items
 */
export function analyzeWithExpert(
  epic: EpicData,
  expertName: string,
  expertRule: string
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Extract expert responsibilities from rule content
  const responsibilities = extractResponsibilities(expertRule);
  const keywords = extractKeywords(expertRule, expertName);

  // Check if epic is relevant to this expert
  const isRelevant = keywords.some((keyword) => epicLower.includes(keyword));

  // Generate items based on expert domain
  // Normalize expert name for matching
  const expertKey = expertName.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
  
  switch (expertKey) {
    case 'backend':
      if (isRelevant || epicLower.includes('admin') || epicLower.includes('panel')) {
        items.push(...generateBackendItems(epic, responsibilities, keywords));
      }
      break;
    case 'frontend':
      if (isRelevant || epicLower.includes('admin') || epicLower.includes('panel') || epicLower.includes('ui')) {
        items.push(...generateFrontendItems(epic, responsibilities, keywords));
      }
      break;
    case 'security':
      if (isRelevant || epicLower.includes('admin') || epicLower.includes('panel') || epicLower.includes('review')) {
        items.push(...generateSecurityItems(epic, responsibilities, keywords));
      }
      break;
    case 'compliance':
      if (isRelevant || epicLower.includes('data') || epicLower.includes('user') || epicLower.includes('personal')) {
        items.push(...generateComplianceItems(epic, responsibilities, keywords));
      }
      break;
    case 'qa':
      // QA is always relevant
      items.push(...generateQAItems(epic, responsibilities, keywords));
      break;
    case 'ux-ui':
      if (isRelevant || epicLower.includes('admin') || epicLower.includes('panel') || epicLower.includes('ui') || epicLower.includes('interface')) {
        items.push(...generateUXUIItems(epic, responsibilities, keywords));
      }
      break;
  }

  return items;
}

/**
 * Extract responsibilities section from expert rule
 */
export function extractResponsibilities(ruleContent: string): string[] {
  const responsibilities: string[] = [];
  const responsibilitiesMatch = ruleContent.match(/## Responsibilities\s*\n([\s\S]*?)(?=\n##|$)/i);

  if (responsibilitiesMatch) {
    const lines = responsibilitiesMatch[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.startsWith('-')) {
        responsibilities.push(trimmed.replace(/^-\s*/, ''));
      }
    }
  }

  return responsibilities;
}

/**
 * Extract keywords from expert rule based on responsibilities and common patterns
 */
function extractKeywords(_ruleContent: string, expertName: string): string[] {
  // Expert-specific keyword patterns
  const expertKeywords: Record<string, string[]> = {
    backend: [
      'api',
      'endpoint',
      'route',
      'database',
      'query',
      'migration',
      'schema',
      'server',
      'backend',
      'supabase',
      'postgres',
      'sql',
      'service',
      'integration',
      'webhook',
    ],
    frontend: [
      'component',
      'ui',
      'page',
      'route',
      'client',
      'react',
      'hook',
      'state',
      'form',
      'input',
      'button',
      'modal',
      'dialog',
    ],
    security: [
      'auth',
      'authentication',
      'authorization',
      'login',
      'logout',
      'session',
      'token',
      'password',
      'credential',
      'permission',
      'role',
      'access control',
      'encrypt',
      'decrypt',
      'secure',
      'vulnerability',
    ],
    compliance: [
      'gdpr',
      'privacy',
      'data protection',
      'personal data',
      'pii',
      'consent',
      'cookie',
      'user rights',
      'data retention',
      'data deletion',
    ],
    qa: ['test', 'testing', 'quality', 'acceptance', 'scenario', 'coverage'],
    'ux/ui': [
      'design',
      'ui',
      'ux',
      'user experience',
      'interface',
      'layout',
      'responsive',
      'mobile',
      'desktop',
      'accessibility',
      'aria',
    ],
  };

  const expertKey = expertName.toLowerCase().replace(/\s+/g, '-');
  return expertKeywords[expertKey] || [];
}

/**
 * Generate backend-specific items
 */
function generateBackendItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Check for API needs
  if (
    epicLower.includes('api') ||
    epicLower.includes('endpoint') ||
    epicLower.includes('admin') ||
    epicLower.includes('panel') ||
    epicLower.includes('review') ||
    epicLower.includes('moderation')
  ) {
    items.push({
      name: `API: ${epic.name}`,
      type: 'Task',
      description: `Implement API endpoints for ${epic.name.toLowerCase()}. Define request/response structure, error handling, and authentication requirements.`,
      requiredExperts: ['Backend', 'Security', 'QA'],
      expertNotes: 'Backend: API design, database queries, and service layer implementation required.',
    });
  }

  // Check for database needs
  if (
    epicLower.includes('database') ||
    epicLower.includes('schema') ||
    epicLower.includes('migration') ||
    epicLower.includes('data') ||
    epicLower.includes('store')
  ) {
    items.push({
      name: `Database Schema: ${epic.name}`,
      type: 'Task',
      description: `Design and implement database schema changes for ${epic.name.toLowerCase()}. Create migrations, indexes, and relationships.`,
      requiredExperts: ['Backend', 'QA'],
      expertNotes: 'Backend: Schema design, migrations, and query optimization required.',
    });
  }

  // Check for service layer needs
  if (epicLower.includes('service') || epicLower.includes('business logic')) {
    items.push({
      name: `Service Layer: ${epic.name}`,
      type: 'Task',
      description: `Implement service layer logic for ${epic.name.toLowerCase()}. Organize business logic, error handling, and data validation.`,
      requiredExperts: ['Backend', 'QA'],
      expertNotes: 'Backend: Service layer organization and business logic implementation required.',
    });
  }

  return items;
}

/**
 * Generate frontend-specific items
 */
function generateFrontendItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Check for UI component needs
  if (
    epicLower.includes('admin') ||
    epicLower.includes('panel') ||
    epicLower.includes('ui') ||
    epicLower.includes('component') ||
    epicLower.includes('page')
  ) {
    items.push({
      name: `UI Components: ${epic.name}`,
      type: 'Task',
      description: `Build UI components for ${epic.name.toLowerCase()}. Create reusable components, forms, and layouts.`,
      requiredExperts: ['Frontend', 'UX/UI', 'QA'],
      expertNotes: 'Frontend: Component structure, state management, and user interaction required.',
    });

    items.push({
      name: `Page/Route: ${epic.name}`,
      type: 'Task',
      description: `Create page and routing for ${epic.name.toLowerCase()}. Implement Next.js page component with proper data fetching.`,
      requiredExperts: ['Frontend', 'Backend', 'QA'],
      expertNotes: 'Frontend: Page structure, routing, and data fetching patterns required.',
    });
  }

  // Check for form needs
  if (epicLower.includes('form') || epicLower.includes('input') || epicLower.includes('submit')) {
    items.push({
      name: `Form Handling: ${epic.name}`,
      type: 'Task',
      description: `Implement form handling for ${epic.name.toLowerCase()}. Add validation, error states, and submission logic.`,
      requiredExperts: ['Frontend', 'Backend', 'QA'],
      expertNotes: 'Frontend: Form validation, state management, and error handling required.',
    });
  }

  return items;
}

/**
 * Generate security-specific items
 */
function generateSecurityItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Check for authentication/authorization needs
  if (
    epicLower.includes('admin') ||
    epicLower.includes('panel') ||
    epicLower.includes('review') ||
    epicLower.includes('permission') ||
    epicLower.includes('access')
  ) {
    items.push({
      name: `Security: Authentication & Authorization for ${epic.name}`,
      type: 'Task',
      description: `Implement authentication and authorization for ${epic.name.toLowerCase()}. Add role-based access control, permission checks, and secure session management.`,
      requiredExperts: ['Security', 'Backend', 'QA'],
      expertNotes: 'Security: Authentication, authorization, and access control required.',
    });
  }

  // Check for input validation needs
  if (epicLower.includes('input') || epicLower.includes('form') || epicLower.includes('data')) {
    items.push({
      name: `Security: Input Validation for ${epic.name}`,
      type: 'Task',
      description: `Implement input validation and sanitization for ${epic.name.toLowerCase()}. Prevent SQL injection, XSS, and CSRF attacks.`,
      requiredExperts: ['Security', 'Backend', 'QA'],
      expertNotes: 'Security: Input validation, sanitization, and security headers required.',
    });
  }

  return items;
}

/**
 * Generate compliance-specific items
 */
function generateComplianceItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Check for data protection needs
  if (
    epicLower.includes('data') ||
    epicLower.includes('user') ||
    epicLower.includes('personal') ||
    epicLower.includes('privacy')
  ) {
    items.push({
      name: `Compliance: Data Protection for ${epic.name}`,
      type: 'Task',
      description: `Ensure GDPR compliance and data protection for ${epic.name.toLowerCase()}. Implement data retention policies, user rights, and privacy controls.`,
      requiredExperts: ['Compliance', 'Backend', 'Security', 'QA'],
      expertNotes: 'Compliance: GDPR compliance, data protection, and privacy controls required.',
    });
  }

  return items;
}

/**
 * Generate QA-specific items
 */
function generateQAItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];

  // QA always generates acceptance criteria and test strategy
  items.push({
    name: `QA: Acceptance Criteria for ${epic.name}`,
    type: 'Task',
    description: `Define acceptance criteria for ${epic.name.toLowerCase()}. Create test scenarios (happy path, edge cases, errors) and success criteria.`,
    requiredExperts: ['QA'],
    expertNotes: 'QA: Acceptance criteria, test scenarios, and quality requirements required.',
  });

  items.push({
    name: `QA: Test Strategy for ${epic.name}`,
    type: 'Task',
    description: `Develop test strategy for ${epic.name.toLowerCase()}. Plan unit tests, integration tests, E2E tests, and manual test scenarios.`,
    requiredExperts: ['QA'],
    expertNotes: 'QA: Test strategy, coverage requirements, and regression testing required.',
  });

  return items;
}

/**
 * Generate UX/UI-specific items
 */
function generateUXUIItems(
  epic: EpicData,
  _responsibilities: string[],
  _keywords: string[]
): ExpertAnalysisItem[] {
  const items: ExpertAnalysisItem[] = [];
  const epicLower = `${epic.name} ${epic.description}`.toLowerCase();

  // Check for UI/UX needs
  if (
    epicLower.includes('admin') ||
    epicLower.includes('panel') ||
    epicLower.includes('ui') ||
    epicLower.includes('interface') ||
    epicLower.includes('user experience')
  ) {
    items.push({
      name: `UX/UI: User Flow for ${epic.name}`,
      type: 'Task',
      description: `Design user flow and experience for ${epic.name.toLowerCase()}. Create wireframes, user journey maps, and interaction patterns.`,
      requiredExperts: ['UX/UI', 'Frontend', 'QA'],
      expertNotes: 'UX/UI: User flow, wireframes, and interaction design required.',
    });

    items.push({
      name: `UX/UI: Accessibility for ${epic.name}`,
      type: 'Task',
      description: `Ensure accessibility compliance for ${epic.name.toLowerCase()}. Implement WCAG 2.1 Level AA, keyboard navigation, and screen reader support.`,
      requiredExperts: ['UX/UI', 'Frontend', 'QA'],
      expertNotes: 'UX/UI: Accessibility, keyboard navigation, and ARIA labels required.',
    });
  }

  return items;
}

/**
 * Analyze epic with all experts and generate comprehensive breakdown
 */
export async function analyzeEpicWithExperts(epicId: string): Promise<ExpertAnalysisItem[]> {
  const { getEpic } = await import('./epicHelpers');
  const epic = await getEpic(epicId);

  // Extract description from Description property (rich_text) or page content
  let description = '';
  if (epic.properties.Description?.rich_text) {
    description = epic.properties.Description.rich_text
      .map((rt: { text?: { content?: string } }) => rt.text?.content || '')
      .join('\n');
  }
  if (!description && epic.content) {
    description = epic.content;
  }

  const epicData: EpicData = {
    name: epic.properties.Name?.title?.[0]?.text?.content || 'Unknown Epic',
    description: description,
    properties: epic.properties,
  };

  const expertRules = readExpertRules();
  const allItems: ExpertAnalysisItem[] = [];

  // Analyze with each expert
  for (const [expertName, expertRule] of Array.from(expertRules.entries())) {
    const items = analyzeWithExpert(epicData, expertName, expertRule);
    allItems.push(...items);
  }

  // Deduplicate items with similar names
  const uniqueItems = deduplicateItems(allItems);

  return uniqueItems;
}

/**
 * Deduplicate items with similar names
 */
function deduplicateItems(items: ExpertAnalysisItem[]): ExpertAnalysisItem[] {
  const seen = new Set<string>();
  const unique: ExpertAnalysisItem[] = [];

  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

