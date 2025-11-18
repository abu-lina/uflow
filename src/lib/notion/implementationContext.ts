/**
 * Implementation context builder - builds comprehensive context for AI implementation
 * Combines task info, expert rules, and codebase context
 */

import type { SprintItem } from './sprintWorkEngine';
import { readExpertRules } from './epicExpertAnalysis';

export interface ImplementationContext {
  task: {
    name: string;
    type: string;
    description: string;
    acceptanceCriteria?: string;
    expertNotes?: string;
    epicInfo?: {
      name: string;
      url: string;
    };
  };
  expertRules: Map<string, string>;
  requiredExperts: string[];
  implementationGuidelines: string;
  validationCriteria: string;
}

/**
 * Extract implementation guidelines from expert rules
 */
function extractImplementationGuidelines(expertRules: Map<string, string>, requiredExperts: string[]): string {
  const guidelines: string[] = [];

  for (const expert of requiredExperts) {
    const rule = expertRules.get(expert);
    if (!rule) continue;

    // Extract Responsibilities section
    const responsibilitiesMatch = rule.match(/## Responsibilities\s*\n\n([\s\S]*?)(?=##|$)/);
    if (responsibilitiesMatch) {
      guidelines.push(`**${expert} Responsibilities:**\n${responsibilitiesMatch[1].trim()}`);
    }

    // Extract Common Patterns section if available
    const patternsMatch = rule.match(/## Common Patterns\s*\n\n([\s\S]*?)(?=##|$)/);
    if (patternsMatch) {
      guidelines.push(`**${expert} Common Patterns:**\n${patternsMatch[1].trim()}`);
    }
  }

  return guidelines.join('\n\n');
}

/**
 * Extract validation criteria from expert rules
 */
function extractValidationCriteria(expertRules: Map<string, string>, requiredExperts: string[]): string {
  const criteria: string[] = [];

  for (const expert of requiredExperts) {
    const rule = expertRules.get(expert);
    if (!rule) continue;

    // Extract Review Criteria section
    const reviewMatch = rule.match(/## Review Criteria\s*\n\n([\s\S]*?)(?=##|$)/);
    if (reviewMatch) {
      criteria.push(`**${expert} Review Criteria:**\n${reviewMatch[1].trim()}`);
    }

    // Extract Standards section if available
    const standardsMatch = rule.match(/## Standards\s*\n\n([\s\S]*?)(?=##|$)/);
    if (standardsMatch) {
      criteria.push(`**${expert} Standards:**\n${standardsMatch[1].trim()}`);
    }
  }

  return criteria.join('\n\n');
}

/**
 * Build comprehensive implementation context from sprint item and expert rules
 */
export async function buildImplementationContext(item: SprintItem): Promise<ImplementationContext> {
  // Load all expert rules
  const allExpertRules = readExpertRules();

  // Get required experts from item refinement or infer from task type
  const requiredExperts = item.refinement || inferRequiredExperts(item);

  // Filter expert rules to only those required
  const relevantExpertRules = new Map<string, string>();
  for (const expert of requiredExperts) {
    const rule = allExpertRules.get(expert);
    if (rule) {
      relevantExpertRules.set(expert, rule);
    }
  }

  // Extract implementation guidelines
  const implementationGuidelines = extractImplementationGuidelines(relevantExpertRules, requiredExperts);

  // Extract validation criteria
  const validationCriteria = extractValidationCriteria(relevantExpertRules, requiredExperts);

  return {
    task: {
      name: item.name,
      type: item.type,
      description: item.description,
      acceptanceCriteria: item.acceptanceCriteria,
      expertNotes: item.expertNotes,
      epicInfo: item.epicInfo,
    },
    expertRules: relevantExpertRules,
    requiredExperts,
    implementationGuidelines,
    validationCriteria,
  };
}

/**
 * Infer required experts from task type and content if not specified
 */
function inferRequiredExperts(item: SprintItem): string[] {
  const experts: string[] = [];
  const content = `${item.name} ${item.description}`.toLowerCase();

  // Always include QA for user-facing features
  if (item.type === 'Story' || item.type === 'Task') {
    experts.push('QA');
  }

  // Infer from task type
  if (item.type === 'Story') {
    if (!content.includes('frontend only')) {
      experts.push('Backend');
    }
    experts.push('Frontend');
    experts.push('UX/UI');
  } else if (item.type === 'Task') {
    if (content.includes('api') || content.includes('database') || content.includes('backend')) {
      experts.push('Backend');
    }
    if (content.includes('component') || content.includes('ui') || content.includes('page')) {
      experts.push('Frontend');
    }
  }

  // Infer from content keywords
  if (content.includes('auth') || content.includes('login') || content.includes('security')) {
    if (!experts.includes('Security')) {
      experts.push('Security');
    }
  }

  if (content.includes('data') || content.includes('privacy') || content.includes('gdpr')) {
    if (!experts.includes('Compliance')) {
      experts.push('Compliance');
    }
  }

  return experts;
}

/**
 * Format context as a prompt for AI implementation
 */
export function formatContextAsPrompt(context: ImplementationContext): string {
  const parts: string[] = [];

  parts.push('# Task Implementation');
  parts.push('');
  parts.push(`## Task: ${context.task.name}`);
  parts.push(`**Type:** ${context.task.type}`);
  parts.push('');

  if (context.task.description) {
    parts.push('## Description');
    parts.push(context.task.description);
    parts.push('');
  }

  if (context.task.acceptanceCriteria) {
    parts.push('## Acceptance Criteria');
    parts.push(context.task.acceptanceCriteria);
    parts.push('');
  }

  if (context.task.expertNotes) {
    parts.push('## Expert Review Notes');
    parts.push(context.task.expertNotes);
    parts.push('');
  }

  if (context.task.epicInfo) {
    parts.push(`## Related Epic: ${context.task.epicInfo.name}`);
    parts.push('');
  }

  parts.push('## Required Experts');
  parts.push(context.requiredExperts.join(', '));
  parts.push('');

  if (context.implementationGuidelines) {
    parts.push('## Implementation Guidelines');
    parts.push(context.implementationGuidelines);
    parts.push('');
  }

  if (context.validationCriteria) {
    parts.push('## Validation Criteria');
    parts.push(context.validationCriteria);
    parts.push('');
  }

  parts.push('## Instructions');
  parts.push('Implement this task following the expert guidelines above.');
  parts.push('Ensure all acceptance criteria are met.');
  parts.push('Follow the validation criteria when implementing.');
  parts.push('Use the common patterns and standards from the expert rules.');

  return parts.join('\n');
}

