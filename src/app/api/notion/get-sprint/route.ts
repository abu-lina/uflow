import { NextResponse } from 'next/server';
import { getSprint, getSprintIssues } from '@/lib/notion/sprintHelpers';

/**
 * GET /api/notion/get-sprint
 * 
 * Get sprint details and issues
 * 
 * Query parameters:
 * - sprintId: string (required) - The Notion page ID of the sprint
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');

    // Validation
    if (!sprintId) {
      return NextResponse.json(
        { error: 'sprintId query parameter is required' },
        { status: 400 }
      );
    }

    // Get sprint
    const sprint = await getSprint(sprintId);
    const issues = await getSprintIssues(sprintId);

    return NextResponse.json({
      success: true,
      sprint: {
        id: sprint.id,
        url: sprint.url,
        properties: sprint.properties,
        issues,
      },
    });
  } catch (error) {
    console.error('Error getting Notion sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

