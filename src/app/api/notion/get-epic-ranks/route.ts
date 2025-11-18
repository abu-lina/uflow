import { NextResponse } from 'next/server';
import { queryDatabase } from '@/lib/notion/client';

/**
 * GET /api/notion/get-epic-ranks
 * 
 * Get all epics with their current Rank values, sorted by Rank (ascending, 1 = highest priority)
 * 
 * Query params:
 * - databaseId: Optional Epics database ID (without dashes)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId = searchParams.get('databaseId');

    // Epics database ID from URL: https://www.notion.so/2366163f450b8045985af4f66be56792
    // Database ID: 2366163f450b8045985af4f66be56792 (without dashes for API)
    let dbId = databaseId;
    if (!dbId) {
      dbId = '2366163f450b8045985af4f66be56792';
    }

    // Remove dashes if present (Notion API format)
    dbId = dbId.replace(/-/g, '');

    // Query epics sorted by Rank (ascending)
    const results = await queryDatabase(
      dbId,
      undefined,
      [{ property: 'Rank', direction: 'ascending' }]
    );

    const epics = results.map((page: { id: string; url: string; properties: unknown }) => {
      const props = page.properties as Record<string, unknown>;
      const name = (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
      const rank = (props.Rank as { number?: number | null })?.number ?? null;
      const moscow = (props.MoSCoW as { select?: { name?: string } })?.select?.name;
      const status = (props.Status as { status?: { name?: string } })?.status?.name;

      return {
        id: page.id,
        url: page.url,
        name,
        rank,
        moscow,
        status,
      };
    });

    return NextResponse.json({
      success: true,
      count: epics.length,
      epics,
    });
  } catch (error) {
    console.error('Error fetching epic ranks:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch epic ranks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

