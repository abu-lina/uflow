import { NextResponse } from 'next/server';
import { updatePage } from '@/lib/notion/client';

/**
 * POST /api/notion/update-terminology
 * 
 * Update "Souk" to "Provider" in Notion pages
 * 
 * Request body:
 * {
 *   pageId: string (required)
 *   updates: {
 *     name?: string
 *     description?: string
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageId, updates } = body as {
      pageId: string;
      updates: { name?: string; description?: string };
    };

    if (!pageId) {
      return NextResponse.json(
        { error: 'pageId is required' },
        { status: 400 }
      );
    }

    const properties: Record<string, unknown> = {};

    if (updates.name) {
      properties.Name = {
        title: [
          {
            text: {
              content: updates.name,
            },
          },
        ],
      };
    }

    if (updates.description) {
      properties.Description = {
        rich_text: [
          {
            text: {
              content: updates.description,
            },
          },
        ],
      };
    }

    const page = await updatePage(pageId, properties);

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        url: page.url,
      },
    });
  } catch (error) {
    console.error('Error updating Notion page:', error);
    return NextResponse.json(
      {
        error: 'Failed to update page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

