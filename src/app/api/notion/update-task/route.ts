import { NextResponse } from 'next/server';
import { updateTask, type UpdateTaskInput } from '@/lib/notion/taskHelpers';

/**
 * PATCH /api/notion/update-task
 * 
 * Update an existing task in the Notion Issues database
 * 
 * Request body:
 * {
 *   taskId: string (required) - The Notion page ID of the task
 *   name?: string - Update task name
 *   type?: "Story" | "Bug" - Update task type
 *   status?: "Not started" | "Ready" | "In progress" | "Done" - Update status
 *   device?: "Desktop" | "Mobile" | ["Desktop", "Mobile"] - Update device(s)
 *   refinement?: "Backend" | "Frontend" | "QA" | "Security" | "Compliance" | "UX/UI" | [...] - Set refinement experts (replaces existing)
 *   completedRefinement?: "Backend" | "Frontend" | ... | [...] - Set completed refinement (replaces existing)
 *   addRefinement?: "Backend" | "Frontend" | ... | [...] - Add refinement experts (adds to existing)
 *   addCompletedRefinement?: "Backend" | "Frontend" | ... | [...] - Add completed refinement (adds to existing)
 * }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, ...updateFields } = body as { taskId: string } & UpdateTaskInput;

    // Validation
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'taskId is required and must be a string' },
        { status: 400 }
      );
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      );
    }

    // Validate refinement values if provided
    const validRefinementValues = ['Backend', 'Frontend', 'QA', 'Security', 'Compliance', 'UX/UI'];
    
    const validateRefinement = (value: unknown, fieldName: string) => {
      if (value === undefined) return;
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        if (!validRefinementValues.includes(v)) {
          throw new Error(
            `Invalid ${fieldName} value: ${v}. Must be one of: ${validRefinementValues.join(', ')}`
          );
        }
      }
    };

    try {
      validateRefinement(updateFields.refinement, 'refinement');
      validateRefinement(updateFields.completedRefinement, 'completedRefinement');
      validateRefinement(updateFields.addRefinement, 'addRefinement');
      validateRefinement(updateFields.addCompletedRefinement, 'addCompletedRefinement');
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid refinement value' },
        { status: 400 }
      );
    }

    // Update task
    const task = await updateTask(taskId, updateFields);

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        url: task.url,
      },
    });
  } catch (error) {
    console.error('Error updating Notion task:', error);
    return NextResponse.json(
      {
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

