/**
 * Backlog Generator - Generate prioritized epic backlog page
 */

import { getAllEpics } from './epicHelpers';
import { createPageInDataSource, appendContentToPage } from './client';
import type { MoSCoW, EpicStatus } from './epicHelpers';

export interface EpicWithStatus {
  id: string;
  url: string;
  name: string;
  rank: number | null;
  moscow: MoSCoW | null;
  status: EpicStatus | null;
  description: string;
  labels: string[];
  targetDelivery: string | null;
  implementationStatus: 'Fully Implemented' | 'Partially Implemented' | 'Not Implemented';
  reviewNotes: string;
  recommendation: string;
}

export interface BacklogStatistics {
  total: number;
  byMoscow: Record<MoSCoW, number>;
  byStatus: Record<EpicStatus, number>;
  byImplementation: {
    fully: number;
    partial: number;
    notStarted: number;
  };
  newlyCreated: number;
}

/**
 * Map epic to implementation status based on FEATURE_REVIEW_SUMMARY.md
 */
function mapImplementationStatus(
  epicName: string,
  epicStatus: EpicStatus | null
): {
  status: EpicWithStatus['implementationStatus'];
  notes: string;
  recommendation: string;
} {
  const name = epicName.toLowerCase();

  // Fully implemented
  if (
    name.includes('user registration') ||
    name.includes('authentication') ||
    name.includes('register & manage provider') ||
    name.includes('browse') ||
    name.includes('bookmark')
  ) {
    return {
      status: 'Fully Implemented',
      notes: 'Feature is fully implemented and working.',
      recommendation: epicStatus === 'Done' ? 'Epic status is correct.' : 'Update epic status to "Done".',
    };
  }

  // Partially implemented
  if (name.includes('approve') || name.includes('reject') || name.includes('admin')) {
    return {
      status: 'Partially Implemented',
      notes: 'Database support exists, but admin UI is missing. RLS policies are in place.',
      recommendation: 'Update epic status to "In progress". Create admin UI tasks.',
    };
  }

  // Not implemented
  return {
    status: 'Not Implemented',
    notes: 'Feature has not been implemented yet.',
    recommendation: 'Plan implementation and break down into stories/tasks.',
  };
}

/**
 * Calculate priority score for sorting
 */
function calculatePriorityScore(epic: EpicWithStatus): number {
  // Primary: Rank (lower = higher priority, null = lowest)
  const rankScore = epic.rank ?? 999999;

  // Secondary: MoSCoW (Must=1, Should=2, Could=3, Won't=4)
  const moscowWeights: Record<MoSCoW, number> = {
    'Must have': 1,
    'Should have': 2,
    'Could have': 3,
    "Won't have": 4,
  };
  const moscowScore = epic.moscow ? moscowWeights[epic.moscow] * 1000 : 5000;

  // Tertiary: Status (Not started=1, In progress=2, Done=3)
  const statusWeights: Record<EpicStatus, number> = {
    'Not started': 1,
    'In progress': 2,
    'Done': 3,
  };
  const statusScore = epic.status ? statusWeights[epic.status] * 100 : 300;

  // Quaternary: Implementation (Not Implemented=1, Partial=2, Fully=3)
  const implWeights = {
    'Not Implemented': 1,
    'Partially Implemented': 2,
    'Fully Implemented': 3,
  };
  const implScore = implWeights[epic.implementationStatus] * 10;

  return rankScore * 100000 + moscowScore + statusScore + implScore;
}

/**
 * Fetch and process all epics
 */
export async function fetchAndProcessEpics(
  databaseId?: string,
  newlyCreatedEpicNames: string[] = []
): Promise<{
  epics: EpicWithStatus[];
  statistics: BacklogStatistics;
}> {
  // Try to fetch epics, but handle errors gracefully
  let epics: Array<{ id: string; url: string; properties: unknown }> = [];
  try {
    // getAllEpics handles database ID formatting internally
    let dbId = databaseId;
    if (!dbId) {
      // Epics database ID from URL: https://www.notion.so/2366163f450b8045985af4f66be56792
      // Database ID: 2366163f450b8045985af4f66be56792 (without dashes for API)
      dbId = '2366163f450b8045985af4f66be56792';
    }
    epics = await getAllEpics(dbId);
  } catch (error) {
    // If query fails, return empty list - backlog will be generated with just newly created epics
    console.warn('Could not fetch existing epics for backlog generation:', error);
    console.warn('Backlog will be generated with limited information');
  }

  // If no epics fetched, return empty list
  if (epics.length === 0) {
    return {
      epics: [],
      statistics: {
        total: 0,
        byMoscow: { 'Must have': 0, 'Should have': 0, 'Could have': 0, "Won't have": 0 },
        byStatus: { 'Not started': 0, 'In progress': 0, 'Done': 0 },
        byImplementation: { fully: 0, partial: 0, notStarted: 0 },
        newlyCreated: newlyCreatedEpicNames.length,
      },
    };
  }

  const processedEpics: EpicWithStatus[] = epics.map((epic) => {
    const props = epic.properties as Record<string, unknown>;
    const name = (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || 'Untitled';
    const rank = (props.Rank as { number?: number | null })?.number ?? null;
    const moscow = (props.MoSCoW as { select?: { name?: string } })?.select?.name as MoSCoW | null;
    const status = (props.Status as { status?: { name?: string } })?.status?.name as EpicStatus | null;
    const labels = (props.Labels as { multi_select?: Array<{ name?: string }> })?.multi_select?.map((l) => l.name || '') || [];
    const targetDelivery = (props['Target Delivery'] as { date?: { start?: string } })?.date?.start || null;

    const { status: implStatus, notes, recommendation } = mapImplementationStatus(name, status);

    return {
      id: epic.id,
      url: epic.url,
      name,
      rank,
      moscow,
      status,
      description: '', // Would need to fetch page content
      labels,
      targetDelivery,
      implementationStatus: implStatus,
      reviewNotes: notes,
      recommendation,
    };
  });

  // Sort by priority
  processedEpics.sort((a, b) => calculatePriorityScore(a) - calculatePriorityScore(b));

  // Calculate statistics
  const statistics: BacklogStatistics = {
    total: processedEpics.length,
    byMoscow: {
      'Must have': 0,
      'Should have': 0,
      'Could have': 0,
      "Won't have": 0,
    },
    byStatus: {
      'Not started': 0,
      'In progress': 0,
      'Done': 0,
    },
    byImplementation: {
      fully: 0,
      partial: 0,
      notStarted: 0,
    },
    newlyCreated: newlyCreatedEpicNames.length,
  };

  for (const epic of processedEpics) {
    if (epic.moscow) {
      statistics.byMoscow[epic.moscow]++;
    }
    if (epic.status) {
      statistics.byStatus[epic.status]++;
    }
    if (epic.implementationStatus === 'Fully Implemented') {
      statistics.byImplementation.fully++;
    } else if (epic.implementationStatus === 'Partially Implemented') {
      statistics.byImplementation.partial++;
    } else {
      statistics.byImplementation.notStarted++;
    }
  }

  return {
    epics: processedEpics,
    statistics,
  };
}

/**
 * Generate backlog page content
 */
export function generateBacklogContent(
  epics: EpicWithStatus[],
  statistics: BacklogStatistics,
  newlyCreatedEpics: Array<{ name: string; url: string }>
): string {
  let content = `# Prioritized Epic Backlog\n\n`;
  content += `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
  
  // Note if epics couldn't be fetched
  if (epics.length === 0 && newlyCreatedEpics.length > 0) {
    content += `⚠️ **Note**: Could not fetch all existing epics from database due to query limitations. This backlog includes the newly created epics. To see all epics, please view the Epics database directly in Notion.\n\n`;
  }

  // Summary Statistics
  content += `## Summary Statistics\n\n`;
  content += `- **Total Epics**: ${statistics.total} (${statistics.total - statistics.newlyCreated} existing + ${statistics.newlyCreated} newly created)\n`;
  content += `- **By MoSCoW**: Must (${statistics.byMoscow['Must have']}), Should (${statistics.byMoscow['Should have']}), Could (${statistics.byMoscow['Could have']}), Won't (${statistics.byMoscow["Won't have"]})\n`;
  content += `- **By Status**: Not started (${statistics.byStatus['Not started']}), In progress (${statistics.byStatus['In progress']}), Done (${statistics.byStatus['Done']})\n`;
  content += `- **By Implementation**: Fully (${statistics.byImplementation.fully}), Partial (${statistics.byImplementation.partial}), Not started (${statistics.byImplementation.notStarted})\n\n`;

  // New Epics Created
  if (newlyCreatedEpics.length > 0) {
    content += `## New Epics Created (Overhaul)\n\n`;
    for (const epic of newlyCreatedEpics) {
      content += `- [${epic.name}](${epic.url})\n`;
    }
    content += `\n`;
  }

  // Priority Ranking System
  content += `## Priority Ranking System\n\n`;
  content += `- **Rank 1** = Highest priority (top of backlog)\n`;
  content += `- Prioritized by: Rank → MoSCoW → Status → Implementation\n`;
  content += `- Lower rank number = higher priority\n\n`;

  // Prioritized Epics
  content += `## Prioritized Epics\n\n`;

  for (let i = 0; i < epics.length; i++) {
    const epic = epics[i];
    const rankLabel = epic.rank ? `Rank ${epic.rank}` : 'Unranked';

    content += `### ${rankLabel}: ${epic.name}\n\n`;
    content += `- **MoSCoW**: ${epic.moscow || 'Not set'}\n`;
    content += `- **Status**: ${epic.status || 'Not set'}\n`;
    content += `- **Implementation**: ${epic.implementationStatus}\n`;
    content += `- **Review Notes**: ${epic.reviewNotes}\n`;
    content += `- **Recommendation**: ${epic.recommendation}\n`;
    if (epic.labels.length > 0) {
      content += `- **Labels**: ${epic.labels.join(', ')}\n`;
    }
    if (epic.targetDelivery) {
      content += `- **Target Delivery**: ${epic.targetDelivery}\n`;
    }
    content += `- **Link**: [View Epic](${epic.url})\n\n`;
  }

  return content;
}

/**
 * Create prioritized backlog page in Notion
 */
export async function createPrioritizedBacklogPage(
  epics: EpicWithStatus[],
  statistics: BacklogStatistics,
  newlyCreatedEpics: Array<{ name: string; url: string }>,
  _parentPageId?: string
): Promise<{ id: string; url: string }> {
  const content = generateBacklogContent(epics, statistics, newlyCreatedEpics);

  // Use the same approach as createEpic - get data source ID from environment
  const EPICS_DATA_SOURCE_ID = process.env.NOTION_EPICS_DATA_SOURCE_ID;
  if (!EPICS_DATA_SOURCE_ID) {
    throw new Error(
      'NOTION_EPICS_DATA_SOURCE_ID environment variable is required. ' +
      'Set it in your .env.local file. See env.template for details.'
    );
  }

  // Create page in Epics database (same as epic creation)
  let page;
  try {
    page = await createPageInDataSource(
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
  } catch (error) {
    console.error('Failed to create backlog page:', error);
    throw new Error(`Failed to create backlog page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Add content to the page
  try {
    await appendContentToPage(page.id, content);
  } catch (error) {
    console.warn('Failed to add content to backlog page, but page was created:', error);
    // Page is created, content addition is optional
  }

  return {
    id: page.id,
    url: page.url,
  };
}

