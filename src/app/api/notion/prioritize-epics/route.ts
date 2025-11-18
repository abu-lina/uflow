import { NextResponse } from 'next/server';
import { updateEpic, getAllEpics } from '@/lib/notion/epicHelpers';
import type { MoSCoW, EpicStatus } from '@/lib/notion/epicHelpers';

/**
 * POST /api/notion/prioritize-epics
 * 
 * Calculate and set Rank property for all epics based on priority
 * 
 * Request body:
 * {
 *   epicIds?: string[] (optional) - Specific epic IDs to prioritize, or all if not provided
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { epicIds } = body as { epicIds?: string[] };

    // Fetch all epics from the database
    // Use getAllEpics helper which queries the database directly (more efficient)
    let pages;
    try {
      pages = await getAllEpics();
    } catch (error) {
      console.warn('Database query failed, falling back to search API:', error);
      // Fallback to search API if database query fails
    const searchResults = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_API_TOKEN}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'page',
        },
      }),
    });

    if (!searchResults.ok) {
        throw new Error('Failed to fetch epics');
    }

    const searchData = await searchResults.json();
      pages = searchData.results || [];
    }

    // Extract epic data from pages
    const epics: Array<{
      id: string;
      name: string;
      moscow: MoSCoW | null;
      status: EpicStatus | null;
      url: string;
      currentRank: number | null;
    }> = [];

    for (const page of pages) {
      const props = (page as { properties?: Record<string, unknown> }).properties || {};
      
      // Check if this page has Epic properties (MoSCoW, Status, etc.)
      if (props.MoSCoW || props.Status) {
        const name = (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
        const moscow = (props.MoSCoW as { select?: { name?: string } })?.select?.name as MoSCoW | null;
        const status = (props.Status as { status?: { name?: string } })?.status?.name as EpicStatus | null;
        const currentRank = (props.Rank as { number?: number })?.number || null;

        // Filter by epicIds if provided
        if (!epicIds || epicIds.includes(page.id)) {
          epics.push({
            id: page.id,
            name,
            moscow,
            status,
            url: (page as { url?: string }).url || '',
            currentRank,
          });
        }
      }
    }

    const epicsWithRanks = epics;

    // Calculate priority scores and sort
    // Prioritization logic:
    // 1. MoSCoW priority: Must have/Must (4) > Should have/Should (3) > Could have/Could (2) > Won't (v1) (1)
    // 2. Status priority: In progress (3) > Not started (2) > Done (1)
    // 3. Current Rank as tiebreaker (lower rank = higher priority)
    const moscowPriority: Record<string, number> = {
      'Must have': 4,
      'Must': 4,
      'Should have': 3,
      'Should': 3,
      'Could have': 2,
      'Could': 2,
      "Won't (v1)": 1,
      "Won't have": 1,
      "Won't": 1,
      };

    const statusPriority: Record<string, number> = {
      'In progress': 3,
      'Not started': 2,
      'Done': 1,
      };

    const epicsWithScores = epicsWithRanks.map((epic) => {
      const moscow = epic.moscow || "Won't (v1)";
      const status = epic.status || 'Not started';

      // Higher priority score = higher priority
      // Use large multipliers to ensure proper sorting
      const moscowScore = moscowPriority[moscow] || 0;
      const statusScore = statusPriority[status] || 0;
      
      // For tiebreaking, use current rank (lower rank = higher priority)
      // Add as negative so lower ranks get higher scores
      const rankTiebreaker = epic.currentRank !== null ? 1000 - epic.currentRank : 0;

      const priorityScore =
        moscowScore * 10000 +
        statusScore * 1000 +
        rankTiebreaker;

      return {
        ...epic,
        priorityScore,
      };
    });

    // Sort by priority (descending = higher priority first)
    epicsWithScores.sort((a, b) => b.priorityScore - a.priorityScore);

    // Assign ranks (1 = highest priority)
    const updates = [];
    for (let i = 0; i < epicsWithScores.length; i++) {
      const epic = epicsWithScores[i];
      const rank = i + 1;

      // Only update if rank changed
      if (epic.currentRank !== rank) {
      try {
        await updateEpic(epic.id, { rank });
        updates.push({
          id: epic.id,
          url: epic.url,
          name: epic.name,
          rank,
          moscow: epic.moscow,
          status: epic.status,
        });
          
          // Add small delay to avoid rate limiting (100ms between updates)
          if (i < epicsWithScores.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
      } catch (error) {
        console.error(`Failed to update epic ${epic.id}:`, error);
        updates.push({
          id: epic.id,
          name: epic.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        // Rank unchanged, skip update
        updates.push({
          id: epic.id,
          url: epic.url,
          name: epic.name,
          rank,
          moscow: epic.moscow,
          status: epic.status,
          skipped: true,
        });
      }
    }

    const successful = updates.filter((u) => !('error' in u));
    const failed = updates.filter((u) => 'error' in u);

    return NextResponse.json({
      success: true,
      total: epics.length,
      updated: successful.length,
      failed: failed.length,
      epics: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('Error prioritizing epics:', error);
    return NextResponse.json(
      {
        error: 'Failed to prioritize epics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

