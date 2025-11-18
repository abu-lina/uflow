import { NextResponse } from 'next/server';
import { breakDownEpic } from '@/lib/notion/epicBreakdown';

/**
 * POST /api/notion/break-down-epic
 * 
 * Break down an epic into stories and tasks, and optionally auto-refine them
 * 
 * Request body:
 * {
 *   epicId: string (required) - The Notion page ID of the epic
 *   autoRefine?: boolean (optional, defaults to true) - Whether to auto-refine generated items
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { epicId, autoRefine = true } = body as { epicId: string; autoRefine?: boolean };

    // Validation
    if (!epicId || typeof epicId !== 'string') {
      return NextResponse.json(
        { error: 'epicId is required and must be a string' },
        { status: 400 }
      );
    }

    // Break down epic
    const result = await breakDownEpic(epicId, autoRefine);

    return NextResponse.json({
      success: true,
      breakdown: {
        stories: result.stories,
        tasks: result.tasks,
        total: result.stories.length + result.tasks.length,
      },
    });
  } catch (error) {
    console.error('Error breaking down epic:', error);
    return NextResponse.json(
      {
        error: 'Failed to break down epic',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

