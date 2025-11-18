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
    console.log('📋 Refining tasks from top-ranked epic...\n');
    
    // Call the new API route that handles everything server-side
    const response = await fetch(`${API_URL}/api/notion/refine-top-epic-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to refine top epic tasks');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to refine tasks');
    }
    
    // Display epic information
    console.log(`✅ Found top epic:`);
    console.log(`   Name: ${data.epic.name}`);
    console.log(`   Rank: ${data.epic.rank ?? 'N/A'}`);
    console.log(`   MoSCoW: ${data.epic.moscow || 'N/A'}`);
    console.log(`   Status: ${data.epic.status || 'N/A'}`);
    console.log(`   URL: ${data.epic.url}\n`);
    
    if (data.tasks.length === 0) {
      console.log('⚠️  No tasks/stories found for this epic.');
      console.log(`   You may need to break down the epic first using @break-down-epic.md\n`);
      return;
    }
    
    console.log(`✅ Found ${data.tasks.length} task(s)/story(ies)\n`);
    
    console.log('✅ Refinement completed!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total: ${data.summary.total}`);
    console.log(`   Successful: ${data.summary.successful}`);
    console.log(`   Failed: ${data.summary.failed}\n`);
    
    if (data.tasks && data.tasks.length > 0) {
      console.log('📝 Detailed Results:\n');
      data.tasks.forEach((result: { taskName: string; taskUrl: string; success: boolean; experts?: string[]; error?: string }) => {
        if (result.success) {
          console.log(`   ✅ ${result.taskName}`);
          console.log(`      URL: ${result.taskUrl}`);
          if (result.experts && result.experts.length > 0) {
            console.log(`      Refinement Experts: ${result.experts.join(', ')}`);
            console.log(`      → Updated in Notion: "Refinement" field`);
            console.log(`      → Updated in Notion: "Completed Refinement" field (experts: ${result.experts.join(', ')})`);
          }
          console.log(`      → Updated in Notion: "Description" property`);
          console.log(`         - Expert Review Notes`);
          console.log(`         - Acceptance Criteria`);
        } else {
          console.log(`   ❌ ${result.taskName}`);
          console.log(`      URL: ${result.taskUrl}`);
          console.log(`      Error: ${result.error || 'Unknown error'}`);
        }
        console.log(''); // Empty line for readability
      });
    }
    
    console.log(`\n✅ Refinement Complete!\n`);
    console.log(`📋 What was updated in Notion:`);
    console.log(`   1. "Refinement" field → Set with required experts`);
    console.log(`   2. "Completed Refinement" field → Added experts who performed the refinement`);
    console.log(`   3. "Description" property → Added expert notes and acceptance criteria\n`);
    console.log(`🔗 View in Notion:`);
    console.log(`   Epic: ${data.epic.url}`);
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

