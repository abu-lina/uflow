/**
 * Script to refine all tasks in the top-ranked epic
 * 
 * This script:
 * 1. Fetches all epics sorted by rank and finds the top one (rank 1)
 * 2. Gets all tasks/stories for that epic
 * 3. Refines all of them using batch-refine API
 * 
 * Usage: npx tsx scripts/refine-top-epic-tasks.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface Epic {
  id: string;
  url: string;
  name: string;
  rank: number | null;
  moscow: string | null;
  status: string | null;
}

interface Task {
  id: string;
  url: string;
  properties: {
    Name?: { title?: Array<{ text?: { content?: string } }> };
    Type?: { select?: { name?: string } };
    Status?: { status?: { name?: string } };
  };
}

interface RefineResult {
  taskId: string;
  success: boolean;
  experts?: string[];
  error?: string;
}

async function refineTopEpicTasks() {
  try {
    console.log('📋 Fetching epics to find top-ranked epic...\n');
    
    // Fetch all epics sorted by rank (using get-epic-ranks endpoint)
    const epicsResponse = await fetch(`${API_URL}/api/notion/get-epic-ranks`);
    if (!epicsResponse.ok) {
      const error = await epicsResponse.json();
      throw new Error(error.details || error.error || 'Failed to fetch epics');
    }
    
    const epicsData = await epicsResponse.json();
    if (!epicsData.epics || epicsData.epics.length === 0) {
      console.log('❌ No epics found in the database.');
      return;
    }
    
    // Find top epic (rank 1, or first epic if no rank 1 exists)
    const topEpic = epicsData.epics.find((epic: Epic) => 
      epic.rank === 1
    ) || epicsData.epics[0]; // Fallback to first epic if no rank 1
    
    const epicName = topEpic.name || 'Unknown';
    const epicRank = topEpic.rank ?? 'N/A';
    const epicId = topEpic.id;
    
    console.log(`✅ Found top epic:`);
    console.log(`   Name: ${epicName}`);
    console.log(`   Rank: ${epicRank}`);
    console.log(`   MoSCoW: ${topEpic.moscow || 'N/A'}`);
    console.log(`   Status: ${topEpic.status || 'N/A'}`);
    console.log(`   ID: ${epicId}`);
    console.log(`   URL: ${topEpic.url}\n`);
    
    console.log('📋 Fetching all tasks/stories for this epic...\n');
    
    // Fetch all tasks/stories for this epic
    // Note: epicId needs to be without dashes for the API
    const epicIdForQuery = epicId.replace(/-/g, '');
    const tasksResponse = await fetch(
      `${API_URL}/api/notion/get-stories?epicId=${epicIdForQuery}`
    );
    
    if (!tasksResponse.ok) {
      const error = await tasksResponse.json();
      throw new Error(error.details || error.error || 'Failed to fetch tasks');
    }
    
    const tasksData = await tasksResponse.json();
    if (!tasksData.stories || tasksData.stories.length === 0) {
      console.log('⚠️  No tasks/stories found for this epic.');
      console.log(`   You may need to break down the epic first using @break-down-epic.md\n`);
      return;
    }
    
    const tasks = tasksData.stories as Task[];
    console.log(`✅ Found ${tasks.length} task(s)/story(ies):\n`);
    tasks.forEach((task, index) => {
      const taskName = task.properties.Name?.title?.[0]?.text?.content || 'Unknown';
      const taskType = task.properties.Type?.select?.name || 'Task';
      const taskStatus = task.properties.Status?.status?.name || 'Not started';
      console.log(`   ${index + 1}. ${taskName} (${taskType}, ${taskStatus})`);
    });
    
    console.log(`\n🔧 Refining all ${tasks.length} task(s)...\n`);
    
    // Extract task IDs
    const taskIds = tasks.map(task => task.id);
    
    // Batch refine all tasks
    const refineResponse = await fetch(`${API_URL}/api/notion/batch-refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds }),
    });
    
    if (!refineResponse.ok) {
      const error = await refineResponse.json();
      throw new Error(error.details || error.error || 'Failed to refine tasks');
    }
    
    const refineData = await refineResponse.json();
    
    console.log('✅ Refinement completed!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total: ${refineData.summary.total}`);
    console.log(`   Successful: ${refineData.summary.successful}`);
    console.log(`   Failed: ${refineData.summary.failed}\n`);
    
    if (refineData.results) {
      console.log('📝 Detailed Results:\n');
      refineData.results.forEach((result: RefineResult, index: number) => {
        const task = tasks[index];
        const taskName = task.properties.Name?.title?.[0]?.text?.content || 'Unknown';
        
        if (result.success) {
          console.log(`   ✅ ${taskName}`);
          console.log(`      URL: ${task.url}`);
          if (result.experts && result.experts.length > 0) {
            console.log(`      Refinement Experts: ${result.experts.join(', ')}`);
            console.log(`      → Updated in Notion: "Refinement" field`);
          }
          console.log(`      → Updated in Notion: "Description" property`);
          console.log(`         - Expert Review Notes`);
          console.log(`         - Acceptance Criteria`);
        } else {
          console.log(`   ❌ ${taskName}`);
          console.log(`      URL: ${task.url}`);
          console.log(`      Error: ${result.error || 'Unknown error'}`);
        }
        console.log(''); // Empty line for readability
      });
    }
    
    console.log(`\n✅ Refinement Complete!\n`);
    console.log(`📋 What was updated in Notion:`);
    console.log(`   1. "Refinement" field → Set with required experts`);
    console.log(`   2. "Description" property → Added expert notes and acceptance criteria\n`);
    console.log(`🔗 View in Notion:`);
    console.log(`   Epic: ${topEpic.url}`);
    console.log(`   Tasks: See URLs above\n`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  refineTopEpicTasks()
    .then(() => {
      console.log('✓ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Failed:', error);
      process.exit(1);
    });
}

export { refineTopEpicTasks };

