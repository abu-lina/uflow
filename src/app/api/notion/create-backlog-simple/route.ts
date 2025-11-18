import { NextResponse } from 'next/server';
import { createPageInDataSource, appendContentToPage } from '@/lib/notion/client';

/**
 * POST /api/notion/create-backlog-simple
 * 
 * Simple test to create backlog page in Epics database
 */
export async function POST(_request: Request) {
  try {
    const EPICS_DATA_SOURCE_ID = process.env.NOTION_EPICS_DATA_SOURCE_ID;
    if (!EPICS_DATA_SOURCE_ID) {
      return NextResponse.json(
        { error: 'NOTION_EPICS_DATA_SOURCE_ID not set' },
        { status: 500 }
      );
    }

    const page = await createPageInDataSource(
      EPICS_DATA_SOURCE_ID,
      {
        Name: {
          title: [
            {
              text: {
                content: 'Prioritized Epic Backlog',
              },
            },
          ],
        },
      }
    );

    const content = `# Prioritized Epic Backlog\n\nGenerated on ${new Date().toLocaleDateString()}\n\n## Summary\n\nThis backlog was created successfully!`;

    await appendContentToPage(page.id, content);

    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        url: page.url,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create backlog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

