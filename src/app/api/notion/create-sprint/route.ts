import { NextResponse } from 'next/server';
import { createSprint, type CreateSprintInput } from '@/lib/notion/sprintHelpers';

/**
 * POST /api/notion/create-sprint
 * 
 * Create a new sprint (Sunday-Sunday, or exception: today-Sunday)
 * 
 * Request body:
 * {
 *   name: string (required)
 *   goal?: string (optional)
 *   startDate?: string (optional, ISO date string)
 *   endDate?: string (optional, ISO date string)
 *   isException?: boolean (optional, defaults to false) - If true, start today, end Sunday
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, goal, startDate, endDate, isException } = body as CreateSprintInput;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    // Create sprint
    const sprint = await createSprint({
      name,
      goal,
      startDate,
      endDate,
      isException: isException || false,
    });

    return NextResponse.json({
      success: true,
      sprint: {
        id: sprint.id,
        url: sprint.url,
        startDate: sprint.dates.start.toISOString().split('T')[0],
        endDate: sprint.dates.end.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Error creating Notion sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to create sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



