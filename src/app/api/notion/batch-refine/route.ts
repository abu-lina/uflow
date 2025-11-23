import { NextResponse } from 'next/server';
import { refineTask } from '@/lib/notion/refinementHelpers';

/**
 * POST /api/notion/batch-refine
 * 
 * Automatically refine multiple tasks
 * 
 * Request body:
 * {
 *   taskIds: string[] (required) - Array of Notion page IDs
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskIds } = body as { taskIds: string[] };

    // Validation
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Refine all tasks
    const results = await Promise.allSettled(
      taskIds.map((taskId) => refineTask(taskId))
    );

    const refined: Array<{ taskId: string; success: boolean; experts?: string[]; error?: string }> = [];

    for (let i = 0; i < taskIds.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        refined.push({
          taskId: taskIds[i],
          success: true,
          experts: result.value.requiredExperts,
        });
      } else {
        refined.push({
          taskId: taskIds[i],
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: refined,
      summary: {
        total: taskIds.length,
        successful: refined.filter((r) => r.success).length,
        failed: refined.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error('Error batch refining Notion tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to batch refine tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



