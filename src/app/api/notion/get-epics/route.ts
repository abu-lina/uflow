import { NextResponse } from 'next/server';
import { getAllEpics } from '@/lib/notion/epicHelpers';

/**
 * GET /api/notion/get-epics
 * 
 * Fetch all epics from the Notion Epics database
 * 
 * Query parameters:
 * - databaseId: string (optional) - Database ID for querying
 * - status: string (optional) - Filter by status
 * - moscow: string (optional) - Filter by MoSCoW priority
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId = searchParams.get('databaseId') || undefined;
    const status = searchParams.get('status');
    const moscow = searchParams.get('moscow');

    // Build filter if needed
    let filter: unknown = undefined;
    if (status || moscow) {
      const conditions: unknown[] = [];
      
      if (status) {
        conditions.push({
          property: 'Status',
          select: {
            equals: status,
          },
        });
      }
      
      if (moscow) {
        conditions.push({
          property: 'MoSCoW',
          select: {
            equals: moscow,
          },
        });
      }
      
      if (conditions.length > 0) {
        filter = conditions.length === 1 ? conditions[0] : { and: conditions };
      }
    }

    // Sort by MoSCoW priority (Must have first)
    const sorts = [
      { property: 'MoSCoW', direction: 'ascending' as const },
    ];

    const epics = await getAllEpics(databaseId, filter, sorts);

    return NextResponse.json({
      success: true,
      count: epics.length,
      epics,
    });
  } catch (error) {
    console.error('Error fetching Notion epics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch epics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



