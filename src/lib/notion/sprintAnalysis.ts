/**
 * Sprint analysis helper - analyzes epics and stories for sprint planning
 */

import { getAllEpics } from './epicHelpers';
import { getAllStories } from './taskHelpers';

export interface EpicAnalysis {
  id: string;
  name: string;
  url: string;
  moscow?: string;
  status?: string;
  stories: StoryAnalysis[];
  readyCount: number;
  totalCount: number;
  completionPercentage: number;
}

export interface StoryAnalysis {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  ready: boolean;
  refinement?: string[];
  completedRefinement?: string[];
  epicId?: string;
}

export interface SprintRecommendation {
  recommendedEpics: EpicAnalysis[];
  readyItems: StoryAnalysis[];
  notReadyItems: StoryAnalysis[];
  summary: {
    totalEpics: number;
    totalStories: number;
    readyStories: number;
    notReadyStories: number;
    recommendedCount: number;
  };
}

/**
 * Analyze epics and stories for sprint planning
 */
export async function analyzeForSprint(
  epicsDatabaseId?: string,
  issuesDatabaseId?: string
): Promise<SprintRecommendation> {
  // Fetch all epics
  const epics = await getAllEpics(epicsDatabaseId);
  
  // Fetch all stories/tasks
  const stories = await getAllStories(issuesDatabaseId);
  
  // Group stories by epic
  const epicMap = new Map<string, EpicAnalysis>();
  
  // Initialize epic map
  for (const epic of epics) {
    const epicProps = epic.properties as Record<string, unknown>;
    const name = (epicProps.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
    const moscow = (epicProps.MoSCoW as { select?: { name?: string } })?.select?.name;
    const status = (epicProps.Status as { select?: { name?: string } })?.select?.name;
    
    epicMap.set(epic.id, {
      id: epic.id,
      name,
      url: epic.url,
      moscow,
      status,
      stories: [],
      readyCount: 0,
      totalCount: 0,
      completionPercentage: 0,
    });
  }
  
  // Process stories
  const storyAnalyses: StoryAnalysis[] = [];
  const unassignedStories: StoryAnalysis[] = [];
  
  for (const story of stories) {
    const storyProps = story.properties as Record<string, unknown>;
    const name = (storyProps.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
    const type = (storyProps.Type as { select?: { name?: string } })?.select?.name || 'Story';
    const status = (storyProps.Status as { status?: { name?: string } })?.status?.name || 'Not started';
    const refinement = (storyProps.Refinement as { multi_select?: Array<{ name?: string }> })?.multi_select?.map((r) => r.name || '') || [];
    const completedRefinement = (storyProps['Completed Refinement'] as { multi_select?: Array<{ name?: string }> })?.multi_select?.map((r) => r.name || '') || [];
    const ready = (storyProps['Ready?'] as { formula?: { boolean?: boolean } })?.formula?.boolean || false;
    
    // Get epic relation
    const epicRelation = (storyProps['⭐ Epics'] as { relation?: Array<{ id?: string }> })?.relation || [];
    const epicId = epicRelation[0]?.id;
    
    const storyAnalysis: StoryAnalysis = {
      id: story.id,
      name,
      url: story.url,
      type,
      status,
      ready,
      refinement,
      completedRefinement,
      epicId,
    };
    
    storyAnalyses.push(storyAnalysis);
    
    if (epicId && epicMap.has(epicId)) {
      const epic = epicMap.get(epicId);
      if (epic) {
        epic.stories.push(storyAnalysis);
        epic.totalCount++;
        if (ready && status === 'Ready') {
          epic.readyCount++;
        }
      }
    } else {
      unassignedStories.push(storyAnalysis);
    }
  }
  
  // Calculate completion percentages
  for (const epic of Array.from(epicMap.values())) {
    epic.completionPercentage = epic.totalCount > 0
      ? Math.round((epic.readyCount / epic.totalCount) * 100)
      : 0;
  }
  
  // Sort epics by MoSCoW priority and readiness
  const epicArray = Array.from(epicMap.values());
  epicArray.sort((a, b) => {
    // First by MoSCoW (Must have > Should have > Could have > Won't have)
    const moscowOrder: Record<string, number> = {
      'Must have': 1,
      'Should have': 2,
      'Could have': 3,
      "Won't have": 4,
    };
    const aOrder = moscowOrder[a.moscow || ''] || 99;
    const bOrder = moscowOrder[b.moscow || ''] || 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    
    // Then by ready count (more ready = higher priority)
    return b.readyCount - a.readyCount;
  });
  
  // Separate ready and not ready items
  const readyItems = storyAnalyses.filter((s) => s.ready && s.status === 'Ready');
  const notReadyItems = storyAnalyses.filter((s) => !s.ready || s.status !== 'Ready');
  
  // Recommend epics with ready items, prioritizing "Must have"
  const recommendedEpics = epicArray.filter((epic) => epic.readyCount > 0);
  
  return {
    recommendedEpics,
    readyItems,
    notReadyItems,
    summary: {
      totalEpics: epicArray.length,
      totalStories: storyAnalyses.length,
      readyStories: readyItems.length,
      notReadyStories: notReadyItems.length,
      recommendedCount: recommendedEpics.length,
    },
  };
}

