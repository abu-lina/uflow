import { NextResponse } from 'next/server';
import { queryDatabase } from '@/lib/notion/client';
import { updateEpic } from '@/lib/notion/epicHelpers';

/**
 * POST /api/notion/calculate-epic-ranks
 * 
 * Calculate and set ranks for all epics based on MoSCoW priority and Status
 * 
 * Request body:
 * {
 *   databaseId?: string (optional) - Epics database ID (without dashes)
 * }
 * 
 * Prioritization logic:
 * 1. MoSCoW: Must have > Should have > Could have > Won't have
 * 2. Status: Not started > In progress > Done
 * 3. Name: Alphabetical (for tie-breaking)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { databaseId } = body as { databaseId?: string };

    // Epics database ID from DATABASE_IDS.md
    // URL: https://www.notion.so/2366163f450b8045985af4f66be56792
    // Database ID from URL: 2366163f450b8045985af4f66be56792 (no dashes)
    let dbId = databaseId;
    if (!dbId) {
      // Use default database ID from DATABASE_IDS.md (without dashes for API)
      dbId = '2366163f450b8045985af4f66be56792';
    }

    // Remove dashes if present
    dbId = dbId.replace(/-/g, '');

    // Fetch all epics
    const results = await queryDatabase(dbId);

    // Map and sort epics
    type EpicWithScore = {
      id: string;
      url: string;
      name: string;
      moscow: string;
      status: string;
      priorityScore: number;
    };
    const epicsWithData: EpicWithScore[] = results.map((page: { id: string; url: string; properties: unknown }) => {
      const props = page.properties as Record<string, unknown>;
      const name = (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
      const moscow = (props.MoSCoW as { select?: { name?: string } })?.select?.name || "Won't have";
      const status = (props.Status as { status?: { name?: string } })?.status?.name || 'Not started';

      // Calculate priority score
      // MoSCoW weights: Must=1, Should=2, Could=3, Won't=4
      const moscowWeights: Record<string, number> = {
        'Must have': 1,
        'Should have': 2,
        'Could have': 3,
        "Won't have": 4,
      };

      // Status weights: Not started=1, In progress=2, Done=3
      const statusWeights: Record<string, number> = {
        'Not started': 1,
        'In progress': 2,
        'Done': 3,
      };

      const priorityScore =
        moscowWeights[moscow] * 100 +
        statusWeights[status] * 10 +
        name.toLowerCase().charCodeAt(0) / 1000; // Alphabetical tie-breaker

      return {
        id: page.id,
        url: page.url,
        name,
        moscow,
        status,
        priorityScore,
      };
    });

    // Sort by priority score (ascending = higher priority first)
    epicsWithData.sort((a, b) => a.priorityScore - b.priorityScore);

    // Assign ranks (1 = highest priority)
    const updates = await Promise.all(
      epicsWithData.map(async (epic, index) => {
        const rank = index + 1;
        try {
          await updateEpic(epic.id, { rank });
          return {
            id: epic.id,
            url: epic.url,
            name: epic.name,
            rank,
            moscow: epic.moscow,
            status: epic.status,
          };
        } catch (error) {
          console.error(`Failed to update epic ${epic.id}:`, error);
          return {
            id: epic.id,
            name: epic.name,
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
      epics: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('Error calculating epic ranks:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate epic ranks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

