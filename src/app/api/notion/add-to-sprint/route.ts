import { NextResponse } from 'next/server';
import { addIssuesToSprint } from '@/lib/notion/sprintHelpers';

/**
 * POST /api/notion/add-to-sprint
 * 
 * Add issues (stories/tasks) to a sprint
 * 
 * Request body:
 * {
 *   sprintId: string (required) - The Notion page ID of the sprint
 *   issueIds: string[] (required) - Array of issue page IDs
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprintId, issueIds } = body as { sprintId: string; issueIds: string[] };

    // Validation
    if (!sprintId || typeof sprintId !== 'string') {
      return NextResponse.json(
        { error: 'sprintId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      return NextResponse.json(
        { error: 'issueIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Add issues to sprint
    const result = await addIssuesToSprint(sprintId, issueIds);

    return NextResponse.json({
      success: true,
      sprint: {
        added: result.added,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Error adding issues to sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to add issues to sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

