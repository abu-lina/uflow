import { NextResponse } from 'next/server';
import { analyzeForSprint } from '@/lib/notion/sprintAnalysis';

/**
 * GET /api/notion/sprint-analysis
 * 
 * Analyze epics and stories for sprint planning
 * 
 * Query parameters:
 * - epicsDatabaseId: string (optional) - Epics database ID
 * - issuesDatabaseId: string (optional) - Issues database ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const epicsDatabaseId = searchParams.get('epicsDatabaseId') || undefined;
    const issuesDatabaseId = searchParams.get('issuesDatabaseId') || undefined;

    const analysis = await analyzeForSprint(epicsDatabaseId, issuesDatabaseId);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error analyzing sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


