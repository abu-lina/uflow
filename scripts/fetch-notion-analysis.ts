/**
 * Script to fetch and analyze Notion epics and stories for sprint planning
 * 
 * Usage: npx tsx scripts/fetch-notion-analysis.ts
 */

// Note: This requires database IDs (not data source IDs) for querying
// Get them from your Notion database URLs

const ISSUES_DATABASE_ID = '2366163f-450b-8052-9b2f-f97e97f771db'; // From DATABASE_IDS.md

// You'll need to provide the Epics database ID
// Get it from: https://www.notion.so/workspace/EPICS_DATABASE_ID
const EPICS_DATABASE_ID = process.env.NOTION_EPICS_DATABASE_ID || '';

async function fetchAnalysis() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    console.log('📊 Fetching sprint analysis...\n');
    
    // Fetch analysis
    const analysisUrl = `${baseUrl}/api/notion/sprint-analysis?issuesDatabaseId=${ISSUES_DATABASE_ID}${EPICS_DATABASE_ID ? `&epicsDatabaseId=${EPICS_DATABASE_ID}` : ''}`;
    const response = await fetch(analysisUrl);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Failed to fetch analysis');
    }
    
    const data = await response.json();
    const analysis = data.analysis;
    
    // Display results
    console.log('📈 SPRINT ANALYSIS SUMMARY\n');
    console.log(`Total Epics: ${analysis.summary.totalEpics}`);
    console.log(`Total Stories: ${analysis.summary.totalStories}`);
    console.log(`Ready Stories: ${analysis.summary.readyStories}`);
    console.log(`Not Ready Stories: ${analysis.summary.notReadyStories}`);
    console.log(`Recommended Epics: ${analysis.summary.recommendedCount}\n`);
    
    if (analysis.recommendedEpics.length > 0) {
      console.log('🎯 RECOMMENDED EPICS FOR THIS WEEK\'S SPRINT\n');
      analysis.recommendedEpics.forEach((epic: any, index: number) => {
        console.log(`${index + 1}. ${epic.name}`);
        console.log(`   MoSCoW: ${epic.moscow || 'Not set'}`);
        console.log(`   Status: ${epic.status || 'Not set'}`);
        console.log(`   Ready Items: ${epic.readyCount}/${epic.totalCount} (${epic.completionPercentage}%)`);
        console.log(`   URL: ${epic.url}\n`);
        
        if (epic.stories.length > 0) {
          console.log('   Stories:');
          epic.stories
            .filter((s: any) => s.ready && s.status === 'Ready')
            .forEach((story: any) => {
              console.log(`   - [${story.type}] ${story.name} (${story.status})`);
              console.log(`     ${story.url}`);
            });
          console.log('');
        }
      });
    }
    
    if (analysis.readyItems.length > 0) {
      console.log('✅ READY ITEMS (Can be added to sprint)\n');
      analysis.readyItems.slice(0, 10).forEach((item: any, index: number) => {
        console.log(`${index + 1}. [${item.type}] ${item.name}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   URL: ${item.url}\n`);
      });
      if (analysis.readyItems.length > 10) {
        console.log(`... and ${analysis.readyItems.length - 10} more ready items\n`);
      }
    }
    
    if (analysis.notReadyItems.length > 0) {
      console.log('⏳ NOT READY ITEMS (Need refinement)\n');
      const notReadyByEpic = new Map<string, any[]>();
      analysis.notReadyItems.forEach((item: any) => {
        const epicId = item.epicId || 'Unassigned';
        if (!notReadyByEpic.has(epicId)) {
          notReadyByEpic.set(epicId, []);
        }
        notReadyByEpic.get(epicId)!.push(item);
      });
      
      notReadyByEpic.forEach((items, epicId) => {
        console.log(`Epic: ${epicId === 'Unassigned' ? 'Unassigned' : epicId} (${items.length} items)`);
        items.slice(0, 3).forEach((item: any) => {
          console.log(`  - [${item.type}] ${item.name} (${item.status})`);
        });
        if (items.length > 3) {
          console.log(`  ... and ${items.length - 3} more`);
        }
        console.log('');
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS FOR THIS WEEK\'S SPRINT (Today - Sunday)\n');
    console.log('1. Focus on "Must have" epics first');
    console.log('2. Only add "Ready" items to the sprint');
    console.log('3. Keep sprint size manageable (5-10 items for this shorter week)');
    console.log('4. Complete refinement for remaining items before next sprint\n');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    console.error('\n💡 Make sure:');
    console.error('   - Dev server is running (npm run dev)');
    console.error('   - NOTION_API_TOKEN is set in .env.local');
    console.error('   - Database IDs are correct');
    if (!EPICS_DATABASE_ID) {
      console.error('   - Set NOTION_EPICS_DATABASE_ID environment variable');
    }
    process.exit(1);
  }
}

fetchAnalysis();



