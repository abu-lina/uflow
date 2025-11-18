/**
 * Test script to fetch top issue and refine it
 * Usage: npx tsx scripts/test-refine-top-issue.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testRefineTopIssue() {
  try {
    console.log('📋 Fetching top issue by Rank...\n');
    
    // Fetch top issue
    const storiesResponse = await fetch(`${BASE_URL}/api/notion/get-stories?limit=1`);
    if (!storiesResponse.ok) {
      const error = await storiesResponse.json();
      throw new Error(error.details || error.error || 'Failed to fetch stories');
    }
    
    const storiesData = await storiesResponse.json();
    if (!storiesData.stories || storiesData.stories.length === 0) {
      console.log('❌ No issues found in the database.');
      return;
    }
    
    const topIssue = storiesData.stories[0];
    const issueId = topIssue.id;
    const issueName = (topIssue.properties as any).Name?.title?.[0]?.text?.content || 'Unknown';
    const issueRank = (topIssue.properties as any).Rank?.number || 'N/A';
    
    console.log(`✅ Found top issue:`);
    console.log(`   Name: ${issueName}`);
    console.log(`   Rank: ${issueRank}`);
    console.log(`   ID: ${issueId}`);
    console.log(`   URL: ${topIssue.url}\n`);
    
    console.log('🔧 Refining issue...\n');
    
    // Refine the issue
    const refineResponse = await fetch(`${BASE_URL}/api/notion/auto-refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: issueId }),
    });
    
    if (!refineResponse.ok) {
      const error = await refineResponse.json();
      throw new Error(error.details || error.error || 'Failed to refine issue');
    }
    
    const refineData = await refineResponse.json();
    console.log('✅ Refinement completed successfully!\n');
    console.log('📝 Required Experts:');
    refineData.refinement.requiredExperts.forEach((expert: string) => {
      const note = refineData.refinement.notes[expert];
      console.log(`   - ${expert}: ${note || '(no note)'}`);
    });
    
    console.log(`\n✅ Expert notes should now be visible in Notion:`);
    console.log(`   ${topIssue.url}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testRefineTopIssue();

