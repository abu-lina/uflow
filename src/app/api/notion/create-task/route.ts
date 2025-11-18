import { NextResponse } from 'next/server';
import { createTask } from '@/lib/notion/taskHelpers';

/**
 * POST /api/notion/create-task
 * 
 * Create a new task in the Notion Issues database
 * 
 * Request body:
 * {
 *   name: string (required)
 *   type: "Story" | "Bug" (required)
 *   description?: string (optional)
 *   device?: "Desktop" | "Mobile" (optional)
 *   status?: "Not started" | "Ready" | "In progress" | "Done" (optional, defaults to "Not started")
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, description, device, status, epicId, autoRefine } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!type || !['Story', 'Task', 'Bug'].includes(type)) {
      return NextResponse.json(
        { error: 'Type is required and must be "Story", "Task", or "Bug"' },
        { status: 400 }
      );
    }

    // Create task
    const task = await createTask({
      name,
      type,
      description,
      device,
      status,
      epicId,
    });

    // Auto-refine if requested
    if (autoRefine) {
      try {
        const { refineTask } = await import('@/lib/notion/refinementHelpers');
        await refineTask(task.id);
      } catch (error) {
        console.warn('Failed to auto-refine task:', error);
        // Don't fail the request if refinement fails
      }
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        url: task.url,
      },
      refined: autoRefine || false,
    });
  } catch (error) {
    console.error('Error creating Notion task:', error);
    return NextResponse.json(
      {
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

