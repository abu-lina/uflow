import { NextResponse } from 'next/server';
import {
  getNextSprintItem,
  markItemInProgress,
  markItemDone,
  getSprintProgress,
} from '@/lib/notion/sprintWorkEngine';

/**
 * GET /api/notion/work-sprint
 * 
 * Get the next item to work on from the active sprint
 * 
 * Query parameters:
 * - sprintId: string (required) - The Notion page ID of the sprint
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get('sprintId');

    if (!sprintId) {
      return NextResponse.json(
        { error: 'sprintId query parameter is required' },
        { status: 400 }
      );
    }

    // Get next item
    const nextItem = await getNextSprintItem(sprintId);

    if (!nextItem) {
      return NextResponse.json({
        success: true,
        message: 'No ready items in sprint',
        item: null,
      });
    }

    // Get sprint progress
    const progress = await getSprintProgress(sprintId);

    return NextResponse.json({
      success: true,
      item: nextItem,
      progress,
    });
  } catch (error) {
    console.error('Error getting next sprint item:', error);
    return NextResponse.json(
      {
        error: 'Failed to get next sprint item',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notion/work-sprint
 * 
 * Mark current item as in progress and get next item, or mark item as done
 * 
 * Request body:
 * {
 *   sprintId: string (required)
 *   action: "start" | "complete" (required)
 *   itemId?: string (required for "complete")
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sprintId, action, itemId } = body as {
      sprintId: string;
      action: 'start' | 'complete';
      itemId?: string;
    };

    if (!sprintId) {
      return NextResponse.json(
        { error: 'sprintId is required' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // Get next item and mark as in progress
      const nextItem = await getNextSprintItem(sprintId);

      if (!nextItem) {
        return NextResponse.json({
          success: true,
          message: 'No ready items in sprint',
          item: null,
        });
      }

      // Mark as in progress
      await markItemInProgress(nextItem.id);

      // Get updated progress
      const progress = await getSprintProgress(sprintId);

      return NextResponse.json({
        success: true,
        item: {
          ...nextItem,
          status: 'In progress',
        },
        progress,
      });
    } else if (action === 'complete') {
      if (!itemId) {
        return NextResponse.json(
          { error: 'itemId is required for complete action' },
          { status: 400 }
        );
      }

      // Mark as done
      await markItemDone(itemId);

      // Get next item
      const nextItem = await getNextSprintItem(sprintId);

      // Get updated progress
      const progress = await getSprintProgress(sprintId);

      return NextResponse.json({
        success: true,
        completed: itemId,
        nextItem,
        progress,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "complete"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error working on sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to work on sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

