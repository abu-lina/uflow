import { NextResponse } from 'next/server';
import {
  getNextSprintItem,
  markItemInProgress,
  markItemDone,
  getSprintProgress,
} from '@/lib/notion/sprintWorkEngine';
import { performAutomatedWork } from '@/lib/notion/automatedSprintWork';
import { buildImplementationContext, formatContextAsPrompt } from '@/lib/notion/implementationContext';
import { getActiveSprint, getSprint } from '@/lib/notion/sprintHelpers';

/**
 * POST /api/notion/automated-work-sprint
 * 
 * Automatically implement a sprint item using expert rules, validate, test, and lint.
 * Requires confirmation before marking as done.
 * 
 * Request body:
 * {
 *   sprintId?: string (optional - will find active sprint if not provided)
 *   itemId?: string (optional - will get next item if not provided)
 *   autoConfirm?: boolean (optional - if true, marks done automatically if all checks pass)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprintId: providedSprintId, itemId, autoConfirm = false } = body as {
      sprintId?: string;
      itemId?: string;
      autoConfirm?: boolean;
    };

    // Get sprint
    let sprintId = providedSprintId;
    let sprint;

    if (sprintId) {
      sprint = await getSprint(sprintId);
    } else {
      const activeSprint = await getActiveSprint();
      if (!activeSprint) {
        return NextResponse.json(
          { error: 'No active sprint found and no sprintId provided' },
          { status: 400 }
        );
      }
      sprint = activeSprint;
      sprintId = sprint.id;
    }

    // Get item
    let item;
    if (itemId) {
      // Get specific item - use getNextSprintItem logic but filter by itemId
      const { getSprint } = await import('@/lib/notion/sprintHelpers');
      const { getPage } = await import('@/lib/notion/client');
      const sprint = await getSprint(sprintId);
      const issues = sprint.properties.Issues?.relation || [];
      
      // Find the specific item in the sprint
      const issue = issues.find((i: { id: string }) => i.id === itemId);
      if (!issue) {
        return NextResponse.json(
          { error: `Item ${itemId} not found in sprint ${sprintId}` },
          { status: 404 }
        );
      }

      const page = await getPage(itemId);
      const status = page.properties.Status?.status?.name || 'Not started';
      const name = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
      const type = page.properties.Type?.select?.name || 'Story';
      
      // Extract description using the same logic as getNextSprintItem
      const { getNotionConfig } = await import('@/lib/notion/client');
      const config = getNotionConfig();
      const NOTION_API_BASE = 'https://api.notion.com/v1';
      
      let description = '';
      try {
        const response = await fetch(`${NOTION_API_BASE}/blocks/${itemId}/children`, {
          method: 'GET',
          headers: config.headers,
        });
        
        if (response.ok) {
          const data = await response.json();
          const blocks = data.results || [];
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
          description = texts.join('\n\n') || 'No description available';
        }
      } catch {
        description = 'No description available';
      }

      // Parse expert notes and acceptance criteria
      let expertNotes = '';
      let acceptanceCriteria = '';
      const expertNotesMatch = description.match(/\*\*Expert Review Notes\*\*\s*\n\n([\s\S]*?)(?=\*\*Acceptance Criteria\*\*|$)/);
      if (expertNotesMatch) {
        expertNotes = expertNotesMatch[1].trim();
      }
      const criteriaMatch = description.match(/\*\*Acceptance Criteria\*\*\s*\n\n([\s\S]*?)(?=\*\*|$)/);
      if (criteriaMatch) {
        acceptanceCriteria = criteriaMatch[1].trim();
      }

      // Get epic info
      let epicInfo;
      try {
        const epicRelation = (page.properties as { Epic?: { relation?: Array<{ id: string }> } }).Epic?.relation;
        if (epicRelation && epicRelation.length > 0) {
          const epicId = epicRelation[0].id;
          const epicPage = await getPage(epicId);
          const epicName = epicPage.properties.Name?.title?.[0]?.text?.content || 'Untitled Epic';
          epicInfo = {
            id: epicId,
            name: epicName,
            url: epicPage.url,
          };
        }
      } catch {
        // Epic info not available
      }

      const refinement = (page.properties as { Refinement?: { multi_select?: Array<{ name: string }> } }).Refinement?.multi_select?.map(r => r.name) || [];

      item = {
        id: itemId,
        name,
        type,
        status: status as 'Not started' | 'Ready' | 'In progress' | 'Done',
        description,
        url: page.url,
        priority: 0,
        expertNotes: expertNotes || undefined,
        acceptanceCriteria: acceptanceCriteria || undefined,
        epicInfo,
        refinement: refinement.length > 0 ? refinement : undefined,
      };
    } else {
      // Get next item
      item = await getNextSprintItem(sprintId);
      if (!item) {
        return NextResponse.json({
          success: true,
          message: 'No ready items in sprint',
          item: null,
        });
      }
    }

    // Mark as in progress if not already
    if (item.status !== 'In progress') {
      await markItemInProgress(item.id);
    }

    // Build implementation context
    const context = await buildImplementationContext(item);
    const prompt = formatContextAsPrompt(context);

    // Perform automated work
    const workResult = await performAutomatedWork(item);

    // Get updated progress
    const progress = await getSprintProgress(sprintId);

    // Prepare response
    const response = {
      success: true,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
      },
      context: {
        prompt,
        requiredExperts: context.requiredExperts,
      },
      results: {
        implementation: {
          success: workResult.implementation.success,
          errors: workResult.implementation.errors,
          warnings: workResult.implementation.warnings,
        },
        validation: {
          passed: workResult.validation.passed,
          expertValidations: workResult.validation.expertValidations,
          overallIssues: workResult.validation.overallIssues,
        },
        tests: {
          passed: workResult.tests.passed,
          errors: workResult.tests.errors,
        },
        linting: {
          passed: workResult.linting.passed,
          errors: workResult.linting.errors,
        },
      },
      readyToComplete: workResult.readyToComplete,
      progress,
    };

    // Auto-confirm if requested and all checks pass
    if (autoConfirm && workResult.readyToComplete) {
      // Try to get current branch name
      let branchName: string | undefined;
      try {
        const { getCurrentBranch } = await import('@/lib/git/branchHelpers');
        branchName = await getCurrentBranch();
      } catch {
        // Branch name not available, markItemDone will try to get it
      }
      await markItemDone(item.id, branchName);
      return NextResponse.json({
        ...response,
        completed: true,
        message: 'Item automatically marked as done',
      });
    }

    return NextResponse.json({
      ...response,
      completed: false,
      message: workResult.readyToComplete
        ? 'All checks passed. Confirm to mark as done.'
        : 'Some checks failed. Review issues before marking as done.',
    });
  } catch (error) {
    console.error('Error in automated work sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform automated work on sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notion/automated-work-sprint
 * 
 * Get the next item and its implementation context without implementing
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');

    let sprint;
    let activeSprintId: string;

    if (sprintId) {
      sprint = await getSprint(sprintId);
      activeSprintId = sprintId;
    } else {
      const activeSprint = await getActiveSprint();
      if (!activeSprint) {
        return NextResponse.json(
          { error: 'No active sprint found and no sprintId provided' },
          { status: 400 }
        );
      }
      sprint = activeSprint;
      activeSprintId = sprint.id;
    }

    const item = await getNextSprintItem(activeSprintId);
    if (!item) {
      return NextResponse.json({
        success: true,
        message: 'No ready items in sprint',
        item: null,
      });
    }

    // Build context without implementing
    const context = await buildImplementationContext(item);
    const prompt = formatContextAsPrompt(context);

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        url: item.url,
      },
      context: {
        prompt,
        requiredExperts: context.requiredExperts,
        implementationGuidelines: context.implementationGuidelines,
        validationCriteria: context.validationCriteria,
      },
    });
  } catch (error) {
    console.error('Error getting automated work context:', error);
    return NextResponse.json(
      {
        error: 'Failed to get automated work context',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

