/**
 * Script to add ready items to a sprint
 * 
 * Usage: npx tsx scripts/add-to-sprint.ts [sprintId]
 */

// Load environment variables from .env.local BEFORE importing modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line: string) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
} catch (error) {
  console.warn('⚠️  Could not load .env.local, assuming environment variables are already set');
}

async function addToSprint() {
  try {
    // Get sprint ID from command line argument
    const sprintId = process.argv[2];
    
    if (!sprintId) {
      console.error('❌ Error: Sprint ID is required');
      console.log('Usage: npx tsx scripts/add-to-sprint.ts [sprintId]');
      process.exit(1);
    }

    // Import modules AFTER loading environment variables
    const { getAllStories } = await import('../src/lib/notion/taskHelpers');
    const { getAllEpics } = await import('../src/lib/notion/epicHelpers');
    const { addIssuesToSprint } = await import('../src/lib/notion/sprintHelpers');

    console.log('🔍 Finding ready items...\n');

    // Fetch Epics to get Ranks
    const epics = await getAllEpics(
      undefined,
      undefined,
      [{ property: 'Rank', direction: 'ascending' }]
    );

    // Create map of Epic ID -> Rank
    const epicRankMap = new Map<string, number>();
    epics.forEach((epic: any) => {
      const rank = epic.properties.Rank?.number ?? 999;
      epicRankMap.set(epic.id, rank);
      epicRankMap.set(epic.id.replace(/-/g, ''), rank);
    });

    // Fetch Stories (Ready OR Not started)
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
      ],
    };

    const stories = await getAllStories(undefined, filter);

    if (stories.length === 0) {
      console.log('ℹ️  No ready items found.');
      return;
    }

    // Sort stories by status (Ready first), then Epic Rank (lower rank = higher priority)
    const storiesWithRank = stories.map((story: any) => {
      const epicRelation = story.properties.Epic?.relation || story.properties['⭐ Epics']?.relation || [];
      const epicId = epicRelation[0]?.id;
      const rank = epicId ? (epicRankMap.get(epicId) ?? epicRankMap.get(epicId.replace(/-/g, '')) ?? 999) : 999;
      const status = story.properties.Status?.status?.name || 'Not started';
      const isReady = status === 'Ready';
      
      return {
        ...story,
        epicRank: rank,
        name: story.properties.Name?.title?.[0]?.text?.content || 'Untitled',
        status: status,
        isReady: isReady,
      };
    });

    // Sort by: Ready first, then epic rank (ascending), then by name
    storiesWithRank.sort((a: any, b: any) => {
      if (a.isReady && !b.isReady) return -1;
      if (!a.isReady && b.isReady) return 1;
      if (a.epicRank !== b.epicRank) {
        return a.epicRank - b.epicRank;
      }
      return a.name.localeCompare(b.name);
    });

    // Limit to top 8 items (sprint capacity)
    const topStories = storiesWithRank.slice(0, 8);
    const issueIds = topStories.map((story: any) => story.id);

    console.log(`📋 Found ${stories.length} items (Ready or Not started)`);
    console.log(`✅ Adding top ${topStories.length} items to sprint...\n`);

    // Add issues to sprint
    const result = await addIssuesToSprint(sprintId, issueIds);

    console.log(`✅ Added ${result.added} items to sprint`);
    console.log(`   Total items in sprint: ${result.total}\n`);

    console.log('📋 Added items:');
    topStories.forEach((story: any, index: number) => {
      console.log(`   ${index + 1}. [${story.status}] [Epic Rank ${story.epicRank}] ${story.name}`);
      console.log(`      ${story.url}`);
    });

    console.log('\n✨ Items added successfully!');
    console.log(`   Sprint ID: ${sprintId}`);
    console.log(`   Use @work-sprint.md to start working on items`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  addToSprint();
}

