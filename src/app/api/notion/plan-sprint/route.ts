import { NextResponse } from 'next/server';
import { createSprint, addIssuesToSprint } from '@/lib/notion/sprintHelpers';
import { getAllEpics } from '@/lib/notion/epicHelpers';
import { getAllStories } from '@/lib/notion/taskHelpers';

/**
 * POST /api/notion/plan-sprint
 * 
 * Plans a sprint starting today until Sunday (Review).
 * 1. Creates a sprint (Exception mode: Today -> Sunday)
 * 2. Fetches "Ready" and "Not started" stories sorted by Epic Rank
 * 3. Adds top priority stories to the sprint
 */
export async function POST() {
  try {
    // 1. Create Sprint
    const today = new Date();
    const sprintName = `Sprint ${today.toISOString().split('T')[0]}`;
    const sprintGoal = "Focus on highest priority ready items until review";
    
    const sprint = await createSprint({
      name: sprintName,
      goal: sprintGoal,
      isException: true, // Start today, end Sunday
    });

    // 2. Fetch Epics to get Ranks
    const epics = await getAllEpics(
      undefined,
      undefined,
      [{ property: 'Rank', direction: 'ascending' }]
    );

    // Create map of Epic ID -> Rank
    const epicRankMap = new Map<string, number>();
    epics.forEach((epic: { id: string; properties: Record<string, unknown> }) => {
      const rank = (epic.properties.Rank as { number?: number | null })?.number ?? 999;
      // Store both with and without dashes to be safe
      epicRankMap.set(epic.id, rank);
      epicRankMap.set(epic.id.replace(/-/g, ''), rank);
    });

    // 3. Fetch Stories (Ready OR Not started)
    // We want to ensure we find items.
    const filter = {
      or: [
        {
          property: 'Status',
          status: {
            equals: 'Ready',
          },
        },
        {
          property: 'Status',
          status: {
            equals: 'Not started',
          },
        },
        // Also check for "Planning" or "To Do" just in case
        {
          property: 'Status',
          status: {
            equals: 'To Do',
          },
        }
      ],
    };

    const stories = await getAllStories(undefined, filter);

    // 4. Sort Stories
    // Priority: Ready > Epic Rank > Not started
    interface StoryWithRank {
      story: { id: string; url: string; properties: Record<string, unknown> };
      rank: number;
      isReady: boolean;
      status: string | undefined;
    }
    
    const storiesWithRank: StoryWithRank[] = stories.map((story: { id: string; url: string; properties: Record<string, unknown> }) => {
      const epicRelation = (story.properties.Epic as { relation?: Array<{ id: string }> })?.relation || [];
      let rank = 999;
      
      if (epicRelation.length > 0) {
        const epicId = epicRelation[0].id;
        rank = epicRankMap.get(epicId) ?? 999;
      }

      const status = (story.properties.Status as { status?: { name?: string } })?.status?.name;
      const isReady = status === 'Ready';
      
      return { story, rank, isReady, status };
    });

    // Sort by:
    // 1. Ready (true first)
    // 2. Epic Rank (ascending)
    storiesWithRank.sort((a: StoryWithRank, b: StoryWithRank) => {
      if (a.isReady && !b.isReady) return -1;
      if (!a.isReady && b.isReady) return 1;
      return a.rank - b.rank;
    });

    // 5. Select Top Stories (Capacity planning)
    // Assuming ~5 days remaining, pick top 8 items
    
    const selectedItems = storiesWithRank.slice(0, 8);
    const selectedIds = selectedItems.map((item: StoryWithRank) => item.story.id);

    // 6. Add to Sprint
    let addedCount = 0;
    if (selectedIds.length > 0) {
      const addResult = await addIssuesToSprint(sprint.id, selectedIds);
      addedCount = addResult.added;
    }

    return NextResponse.json({
      success: true,
      sprint: {
        id: sprint.id,
        name: sprintName,
        url: sprint.url,
        dates: {
          start: sprint.dates.start.toISOString().split('T')[0],
          end: sprint.dates.end.toISOString().split('T')[0],
        },
      },
      addedStories: selectedItems.map((item: StoryWithRank) => ({
        id: item.story.id,
        name: (item.story.properties.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled',
        rank: item.rank,
        status: item.status,
        url: item.story.url
      })),
      totalFound: stories.length,
      message: `Created sprint "${sprintName}" and added ${addedCount} high-priority items.`,
    });

  } catch (error) {
    console.error('Error planning sprint:', error);
    return NextResponse.json(
      {
        error: 'Failed to plan sprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
