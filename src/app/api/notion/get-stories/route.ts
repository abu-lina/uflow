import { NextResponse } from 'next/server';
import { getAllStories } from '@/lib/notion/taskHelpers';

/**
 * GET /api/notion/get-stories
 * 
 * Fetch all stories/tasks from the Notion Issues database
 * 
 * Query parameters:
 * - databaseId: string (optional) - Database ID for querying
 * - status: string (optional) - Filter by status
 * - type: string (optional) - Filter by type (Story, Task, Bug)
 * - epicId: string (optional) - Filter by epic relation
 * - sortByRank: boolean (optional, default: true) - Sort by Rank (highest first)
 * - limit: number (optional) - Limit number of results (e.g., for top N by rank)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId = searchParams.get('databaseId') || undefined;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const epicId = searchParams.get('epicId');
    const sortByRank = searchParams.get('sortByRank') !== 'false'; // Default to true
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Build filter if needed
    let filter: unknown = undefined;
    if (status || type || epicId) {
      const conditions: unknown[] = [];
      
      if (status) {
        conditions.push({
          property: 'Status',
          status: {
            equals: status,
          },
        });
      }
      
      if (type) {
        conditions.push({
          property: 'Type',
          select: {
            equals: type,
          },
        });
      }
      
      if (epicId) {
        conditions.push({
          property: 'Epic',
          relation: {
            contains: epicId,
          },
        });
      }
      
      if (conditions.length > 0) {
        filter = conditions.length === 1 ? conditions[0] : { and: conditions };
      }
    }

    // Sort by Rank (ascending: Rank 1 = highest priority), then by Status as tiebreaker
    // Note: Rollup fields may not sort correctly via API, so we use client-side sorting
    const sorts: Array<{ property: string; direction: 'ascending' | 'descending' }> = [];
    
    // Try to sort by Rank via API (rollup field - may not work)
    if (sortByRank) {
      sorts.push({ property: 'Rank', direction: 'ascending' });
    }
    
    // Secondary sort by Status (In progress > Not started > Ready > Done)
    sorts.push({ property: 'Status', direction: 'ascending' });

    let stories = await getAllStories(databaseId, filter, sorts.length > 0 ? sorts : undefined);
    
    // Always sort client-side by Rank if requested (handles rollup fields reliably)
    // This ensures correct sorting even if API sorting fails for rollup fields
    if (sortByRank && stories.length > 0) {
      stories.sort((a: { properties: Record<string, unknown> }, b: { properties: Record<string, unknown> }) => {
        const propsA = a.properties as Record<string, unknown>;
        const propsB = b.properties as Record<string, unknown>;
        
        // Get Rank values (rollup field returns number)
        const rankA = (propsA.Rank as { number?: number | null })?.number ?? 999;
        const rankB = (propsB.Rank as { number?: number | null })?.number ?? 999;
        
        // Primary sort by Rank (ascending: 1 = highest priority)
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        
        // Tiebreaker: Sort by Status
        const statusA = (propsA.Status as { status?: { name?: string } })?.status?.name || '';
        const statusB = (propsB.Status as { status?: { name?: string } })?.status?.name || '';
        
        const statusOrder: Record<string, number> = {
          'In progress': 1,
          'Not started': 2,
          'Ready': 3,
          'Done': 4,
        };
        
        const statusPriorityA = statusOrder[statusA] || 99;
        const statusPriorityB = statusOrder[statusB] || 99;
        
        if (statusPriorityA !== statusPriorityB) {
          return statusPriorityA - statusPriorityB;
        }
        
        // Final tiebreaker: Sort by name alphabetically
        const nameA = (propsA.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || '';
        const nameB = (propsB.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || '';
        return nameA.localeCompare(nameB);
      });
    }
    
    // Apply limit if specified
    if (limit && limit > 0) {
      stories = stories.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      count: stories.length,
      stories,
    });
  } catch (error) {
    console.error('Error fetching Notion stories:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

