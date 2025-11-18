/**
 * Epic breakdown logic - breaks epics into stories and tasks using expert analysis
 */

import { createTask } from './taskHelpers';
import { refineTask } from './refinementHelpers';
import { analyzeEpicWithExperts, type ExpertAnalysisItem } from './epicExpertAnalysis';

export interface BreakdownItem {
  name: string;
  type: 'Story' | 'Task';
  description: string;
  device?: 'Desktop' | 'Mobile';
}

/**
 * Analyze epic description and generate stories and tasks using expert analysis
 * This function is kept for backward compatibility but now uses expert-driven analysis
 */
export async function generateStoriesAndTasks(
  epicId: string
): Promise<ExpertAnalysisItem[]> {
  return await analyzeEpicWithExperts(epicId);
}

/**
 * Break down an epic into stories and tasks using expert-driven analysis
 */
export async function breakDownEpic(
  epicId: string,
  autoRefine: boolean = true
): Promise<{ stories: Array<{ id: string; url: string }>; tasks: Array<{ id: string; url: string }> }> {
  // Use expert analysis to generate stories and tasks
  const breakdownItems = await analyzeEpicWithExperts(epicId);

  const stories: Array<{ id: string; url: string }> = [];
  const tasks: Array<{ id: string; url: string }> = [];

  // Create each item with pre-identified refinement experts
  for (const item of breakdownItems) {
    // Remove dashes from epic ID for relation
    const epicIdForRelation = epicId.replace(/-/g, '');
    const created = await createTask({
      name: item.name,
      type: item.type,
      description: item.description,
      device: item.device || 'Desktop',
      status: 'Not started',
      epicId: epicIdForRelation,
    });

    // Set pre-identified refinement experts
    if (item.requiredExperts && item.requiredExperts.length > 0) {
      try {
        const { updateTask } = await import('./taskHelpers');
        await updateTask(created.id, {
          refinement: item.requiredExperts,
        });
      } catch (error) {
        console.warn(`Failed to set refinement experts for ${created.id}:`, error);
      }
    }

    // Add expert notes to description
    if (item.expertNotes) {
      try {
        const { appendContentToPage } = await import('./client');
        await appendContentToPage(
          created.id,
          `\n\n## Expert Notes\n\n${item.expertNotes}`
        );
      } catch (error) {
        console.warn(`Failed to add expert notes to ${created.id}:`, error);
      }
    }

    if (item.type === 'Story') {
      stories.push({ id: created.id, url: created.url });
    } else {
      tasks.push({ id: created.id, url: created.url });
    }

    // Auto-refine if requested (this will add additional expert notes)
    if (autoRefine) {
      try {
        await refineTask(created.id);
      } catch (error) {
        console.warn(`Failed to auto-refine ${item.type} ${created.id}:`, error);
      }
    }
  }

  return { stories, tasks };
}

