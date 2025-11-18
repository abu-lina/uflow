import { NextResponse } from 'next/server';
import { getAllEpics } from '@/lib/notion/epicHelpers';
import { getAllStories, updateTask } from '@/lib/notion/taskHelpers';
import { refineTask } from '@/lib/notion/refinementHelpers';

/**
 * POST /api/notion/refine-top-epic-tasks
 * 
 * Refine all tasks in the top-ranked epic (rank 1)
 * 
 * This endpoint:
 * 1. Fetches all epics sorted by rank and finds the top one (rank 1)
 * 2. Gets all tasks/stories for that epic
 * 3. Batch refines all of them
 */
export async function POST() {
  try {
    // Epics database ID from URL: https://www.notion.so/2366163f450b8045985af4f66be56792
    // Database ID: 2366163f450b8045985af4f66be56792 (without dashes for API)
    const epicsDbId = '2366163f450b8045985af4f66be56792';
    
    // Fetch all epics using the helper (same as get-epics endpoint)
    const epicResults = await getAllEpics(
      epicsDbId,
      undefined,
      [{ property: 'Rank', direction: 'ascending' }]
    );

    if (!epicResults || epicResults.length === 0) {
      return NextResponse.json(
        { error: 'No epics found in the database' },
        { status: 404 }
      );
    }

    // Find top epic (rank 1, or first epic if no rank 1 exists)
    // Sort by rank client-side to handle any API sorting issues
    const epicsWithRank = epicResults.map((epic: { id: string; url: string; properties: Record<string, unknown> }) => {
      const props = epic.properties as Record<string, unknown>;
      const rank = (props.Rank as { number?: number | null })?.number ?? 999;
      return { epic, rank };
    }).sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank);

    const topEpic = epicsWithRank[0].epic;

    const epicProps = topEpic.properties as Record<string, unknown>;
    const epicName = (epicProps.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Unknown';
    const epicRank = (epicProps.Rank as { number?: number | null })?.number ?? null;
    const epicMoscow = (epicProps.MoSCoW as { select?: { name?: string } })?.select?.name;
    const epicStatus = (epicProps.Status as { status?: { name?: string } })?.status?.name;
    const epicId = topEpic.id;

    // Fetch all tasks/stories for this epic
    // Relation filters use page IDs with dashes
    const filter = {
      property: 'Epic',
      relation: {
        contains: epicId,
      },
    };

    const tasks = await getAllStories(undefined, filter);

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        epic: {
          id: epicId,
          url: topEpic.url,
          name: epicName,
          rank: epicRank,
          moscow: epicMoscow,
          status: epicStatus,
        },
        message: 'No tasks/stories found for this epic. You may need to break down the epic first.',
        tasks: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
        },
      });
    }

    // Extract task IDs and refine all tasks
    const taskIds = tasks.map((task: { id: string }) => task.id);
    
    const results = await Promise.allSettled(
      taskIds.map((taskId: string) => refineTask(taskId))
    );

    const refined: Array<{
      taskId: string;
      taskName: string;
      taskUrl: string;
      success: boolean;
      experts?: string[];
      error?: string;
    }> = [];

    for (let i = 0; i < taskIds.length; i++) {
      const task = tasks[i];
      const taskProps = task.properties as Record<string, unknown>;
      const taskName = (taskProps.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Unknown';
      
      const result = results[i];
      if (result.status === 'fulfilled') {
        const requiredExperts = result.value.requiredExperts;
        
        // Update "Completed Refinement" field with the experts who did the refinement
        try {
          await updateTask(taskIds[i], {
            addCompletedRefinement: requiredExperts,
          });
        } catch (error) {
          console.error(`Failed to update Completed Refinement for task ${taskIds[i]}:`, error);
          // Continue even if this fails - refinement succeeded
        }
        
        refined.push({
          taskId: taskIds[i],
          taskName,
          taskUrl: task.url,
          success: true,
          experts: requiredExperts,
        });
      } else {
        refined.push({
          taskId: taskIds[i],
          taskName,
          taskUrl: task.url,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      epic: {
        id: epicId,
        url: topEpic.url,
        name: epicName,
        rank: epicRank,
        moscow: epicMoscow,
        status: epicStatus,
      },
      tasks: refined,
      summary: {
        total: taskIds.length,
        successful: refined.filter((r) => r.success).length,
        failed: refined.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error('Error refining top epic tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to refine top epic tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

