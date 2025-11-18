import { NextResponse } from 'next/server';
import { refineTask } from '@/lib/notion/refinementHelpers';

/**
 * POST /api/notion/auto-refine
 * 
 * Automatically refine a task by analyzing content and determining required experts
 * 
 * Request body:
 * {
 *   taskId: string (required) - The Notion page ID of the task
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId } = body as { taskId: string };

    // Validation
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required and must be a string' },
        { status: 400 }
      );
    }

    // Refine task
    const result = await refineTask(taskId);

    return NextResponse.json({
      success: true,
      refinement: {
        requiredExperts: result.requiredExperts,
        notes: result.notes,
      },
    });
  } catch (error) {
    console.error('Error refining Notion task:', error);
    return NextResponse.json(
      {
        error: 'Failed to refine task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

