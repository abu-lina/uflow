/**
 * Script to create missing epics identified by gap analysis
 * 
 * Usage: npx tsx scripts/create-missing-epics.ts
 */

import { analyzeEpicGaps, createMissingEpics } from '../src/lib/notion/epicGapAnalysis';

async function main() {
  try {
    console.log('🔍 Analyzing epic gaps...\n');
    
    // Analyze gaps (this doesn't require database query, just checks existing epic names)
    // We'll use a known epic page ID to get the database context if needed
    const gapAnalysis = await analyzeEpicGaps();
    
    console.log(`📊 Found ${gapAnalysis.existingEpicNames.length} existing epics`);
    console.log(`⚠️  Identified ${gapAnalysis.missingEpics.length} missing epics\n`);
    
    if (gapAnalysis.missingEpics.length === 0) {
      console.log('✅ No missing epics found!');
      return;
    }
    
    console.log('📝 Missing epics to create:');
    gapAnalysis.missingEpics.forEach((epic, index) => {
      console.log(`\n${index + 1}. ${epic.name}`);
      console.log(`   Reason: ${epic.reason}`);
      console.log(`   MoSCoW: ${epic.input.moscow}`);
      console.log(`   Status: ${epic.input.status}`);
    });
    
    console.log('\n\n🚀 Creating missing epics...\n');
    const result = await createMissingEpics(gapAnalysis);
    
    console.log(`✅ Successfully created ${result.createdEpics.length} epics:\n`);
    result.createdEpics.forEach((epic) => {
      console.log(`   - ${epic.name}`);
      console.log(`     URL: ${epic.url}\n`);
    });
    
    if (result.createdEpics.length < gapAnalysis.missingEpics.length) {
      console.log(`⚠️  Warning: ${gapAnalysis.missingEpics.length - result.createdEpics.length} epics failed to create`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();


