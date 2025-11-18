/**
 * Script to plan a sprint starting today
 * 
 * Usage: npx tsx scripts/plan-sprint.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function planSprint() {
  try {
    console.log('🏃 Planning sprint...');
    console.log('   - Creating sprint (Today -> Sunday)');
    console.log('   - Fetching high priority stories (Ready/Not started)');
    console.log('   - Adding stories to sprint\n');

    const response = await fetch(`${API_URL}/api/notion/plan-sprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to plan sprint');
    }

    const data = await response.json();

    console.log(`✅ Sprint Created: ${data.sprint.name}`);
    console.log(`   URL: ${data.sprint.url}`);
    console.log(`   Dates: ${data.sprint.dates.start} to ${data.sprint.dates.end}\n`);

    console.log(`🔍 Found ${data.totalFound} potential candidates.`);
    console.log(`✅ Added ${data.addedStories.length} Stories:`);
    data.addedStories.forEach((story: any) => {
      console.log(`   - [${story.status}] [Epic Rank ${story.rank}] ${story.name}`);
      console.log(`     ${story.url}`);
    });

    console.log('\n✨ Sprint planning complete!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  planSprint();
}
