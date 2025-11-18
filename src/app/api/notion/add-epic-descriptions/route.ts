import { NextResponse } from 'next/server';
import { updateEpic, getAllEpics } from '@/lib/notion/epicHelpers';
import { generateEpicDescription, createEpicStories, type EpicData } from '@/lib/notion/epicDescriptionGenerator';

/**
 * POST /api/notion/add-epic-descriptions
 * 
 * Generate and add structured descriptions to epics in Notion
 * 
 * Request body:
 * {
 *   epicIds?: string[] (optional) - Specific epic IDs to update, or all if not provided
 *   createStories?: boolean (optional, default: false) - Whether to create stories in Issues database
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { epicIds, createStories = false } = body as {
      epicIds?: string[];
      createStories?: boolean;
    };

    // Fetch all epics from the database
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
    const epics: EpicData[] = [];

    for (const page of pages) {
      const props = (page as { properties?: Record<string, unknown> }).properties || {};

      // Check if this page has Epic properties (MoSCoW, Status, etc.)
      if (props.MoSCoW || props.Status) {
        const name = (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
        const moscow = (props.MoSCoW as { select?: { name?: string } })?.select?.name || null;
        const status = (props.Status as { status?: { name?: string } })?.status?.name || null;
        const labels = ((props.Labels as { multi_select?: Array<{ name?: string }> })?.multi_select || []).map(
          (item) => item.name || ''
        );
        const rank = (props.Rank as { number?: number })?.number || null;
        const targetDelivery = (props['Target Delivery'] as { date?: { start?: string } })?.date?.start || null;

        // Filter by epicIds if provided
        if (!epicIds || epicIds.includes(page.id)) {
          epics.push({
            id: page.id,
            name,
            moscow: moscow as EpicData['moscow'],
            status: status as EpicData['status'],
            labels,
            rank,
            targetDelivery,
          });
        }
      }
    }

    console.log(`Found ${epics.length} epics to process. Generating descriptions...`);

    // Generate descriptions and update epics
    const updates = [];
    const storyCreationResults: Array<{ epicId: string; epicName: string; stories: Array<{ id: string; url: string; name: string }> }> = [];

    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];

      try {
        // Generate description
        const { description, stories } = generateEpicDescription(epic);

        // Update epic description
        await updateEpic(epic.id, { description });

        // Find the page URL from the original pages array
        const pageUrl = pages.find((p: { id: string; url?: string }) => p.id === epic.id)?.url || '';

        updates.push({
          id: epic.id,
          url: pageUrl,
          name: epic.name,
          description: description.substring(0, 100) + '...', // Preview
        });

        // Create stories if requested
        if (createStories && stories.length > 0) {
          try {
            const createdStories = await createEpicStories(epic.id, stories);
            storyCreationResults.push({
              epicId: epic.id,
              epicName: epic.name,
              stories: createdStories,
            });
          } catch (error) {
            console.error(`Failed to create stories for epic ${epic.id}:`, error);
          }
        }

        // Add delay to avoid rate limiting (100ms between updates)
        if (i < epics.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to update epic ${epic.id}:`, error);
        updates.push({
          id: epic.id,
          name: epic.name,
          error: error instanceof Error ? error.message : 'Unknown error',
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
      storiesCreated: createStories ? storyCreationResults : undefined,
    });
  } catch (error) {
    console.error('Error adding epic descriptions:', error);
    return NextResponse.json(
      {
        error: 'Failed to add epic descriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

