import { NextResponse } from 'next/server';
import { updateEpic } from '@/lib/notion/epicHelpers';

/**
 * POST /api/notion/update-epic-ranks
 * 
 * Update ranks for multiple epics based on desired order
 * 
 * Request body:
 * {
 *   epicIds: string[] (required) - Array of epic IDs in desired order (first = rank 1)
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { epicIds } = body as { epicIds: string[] };

    if (!epicIds || !Array.isArray(epicIds) || epicIds.length === 0) {
      return NextResponse.json(
        { error: 'epicIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Update each epic with its rank (1 for first, 2 for second, etc.)
    const updates = await Promise.all(
      epicIds.map(async (epicId, index) => {
        const rank = index + 1; // Rank 1, 2, 3...
        try {
          const epic = await updateEpic(epicId, { rank });
          return {
            id: epic.id,
            url: epic.url,
            rank,
          };
        } catch (error) {
          console.error(`Failed to update epic ${epicId}:`, error);
          return {
            id: epicId,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const successful = updates.filter((u) => !('error' in u));
    const failed = updates.filter((u) => 'error' in u);

    return NextResponse.json({
      success: true,
      updated: successful.length,
      failed: failed.length,
      updates,
    });
  } catch (error) {
    console.error('Error updating epic ranks:', error);
    return NextResponse.json(
      {
        error: 'Failed to update epic ranks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

