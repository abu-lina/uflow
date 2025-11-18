import { NextResponse } from 'next/server';
import { getEpic, updateEpic } from '@/lib/notion/epicHelpers';
import { queryDatabase } from '@/lib/notion/client';

/**
 * POST /api/notion/move-epic
 * 
 * Move an epic up or down in rank (swap with adjacent epic)
 * 
 * Request body:
 * {
 *   epicId: string (required)
 *   direction: "up" | "down" (required)
 *   databaseId?: string (optional) - Epics database ID for querying
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { epicId, direction, databaseId } = body as {
      epicId: string;
      direction: 'up' | 'down';
      databaseId?: string;
    };

    if (!epicId || typeof epicId !== 'string') {
      return NextResponse.json(
        { error: 'epicId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!direction || !['up', 'down'].includes(direction)) {
      return NextResponse.json(
        { error: 'direction is required and must be "up" or "down"' },
        { status: 400 }
      );
    }

    // Get current epic
    const currentEpic = await getEpic(epicId);
    const currentProps = currentEpic.properties as Record<string, unknown>;
    const currentRank = (currentProps.Rank as { number?: number | null })?.number;

    if (currentRank === null || currentRank === undefined) {
      return NextResponse.json(
        { error: 'Epic does not have a rank set. Set a rank first or use calculate-epic-ranks.' },
        { status: 400 }
      );
    }

    // Epics database ID from URL: https://www.notion.so/2366163f450b8045985af4f66be56792
    // Database ID: 2366163f450b8045985af4f66be56792 (without dashes for API)
    let dbId = databaseId;
    if (!dbId) {
      dbId = '2366163f450b8045985af4f66be56792';
    }

    // Remove dashes if present
    dbId = dbId.replace(/-/g, '');

    // Query all epics to find adjacent epic
    const results = await queryDatabase(
      dbId,
      undefined,
      [{ property: 'Rank', direction: 'ascending' }]
    );

    // Find current epic's position
    type EpicWithRank = { id: string; rank: number };
    const sortedEpics: EpicWithRank[] = results.map((page: { id: string; properties: unknown }) => {
      const props = page.properties as Record<string, unknown>;
      const rank = (props.Rank as { number?: number | null })?.number ?? 999999; // Null ranks go to end
      return {
        id: page.id,
        rank,
      };
    }).sort((a: EpicWithRank, b: EpicWithRank) => a.rank - b.rank);

    const currentIndex = sortedEpics.findIndex((e) => e.id === epicId);
    
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: 'Epic not found in database' },
        { status: 404 }
      );
    }

    // Calculate target index
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sortedEpics.length) {
      return NextResponse.json(
        { error: `Cannot move ${direction}: epic is already at the ${direction === 'up' ? 'top' : 'bottom'}` },
        { status: 400 }
      );
    }

    // Get adjacent epic
    const adjacentEpicId = sortedEpics[targetIndex].id;
    const adjacentEpic = await getEpic(adjacentEpicId);
    const adjacentProps = adjacentEpic.properties as Record<string, unknown>;
    const adjacentRank = (adjacentProps.Rank as { number?: number | null })?.number ?? 999999;

    // Swap ranks
    await Promise.all([
      updateEpic(epicId, { rank: adjacentRank }),
      updateEpic(adjacentEpicId, { rank: currentRank }),
    ]);

    return NextResponse.json({
      success: true,
      epic: {
        id: currentEpic.id,
        url: currentEpic.url,
        oldRank: currentRank,
        newRank: adjacentRank,
      },
      swappedWith: {
        id: adjacentEpic.id,
        url: adjacentEpic.url,
        oldRank: adjacentRank,
        newRank: currentRank,
      },
    });
  } catch (error) {
    console.error('Error moving epic:', error);
    return NextResponse.json(
      {
        error: 'Failed to move epic',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

