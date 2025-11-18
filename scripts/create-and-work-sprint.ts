/**
 * Script to create a new sprint and start working on it
 * 
 * Usage: npx tsx scripts/create-and-work-sprint.ts
 */

// Load environment variables from .env.local BEFORE importing modules
// Using require() to ensure this executes before ES module imports
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
        // Remove surrounding quotes if present
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
  // If .env.local doesn't exist or can't be read, assume env vars are already set
  console.warn('⚠️  Could not load .env.local, assuming environment variables are already set');
}

async function createAndWorkSprint() {
  // Import modules AFTER loading environment variables
  const { createSprint } = await import('../src/lib/notion/sprintHelpers');
  const { getNextSprintItem, markItemInProgress, getSprintProgress } = await import('../src/lib/notion/sprintWorkEngine');
  try {
    console.log('🏃 Creating new sprint...\n');

    // Create sprint
    const today = new Date();
    const sprintName = `Sprint ${today.toISOString().split('T')[0]}`;
    const sprintGoal = "Focus on highest priority ready items";

    const sprint = await createSprint({
      name: sprintName,
      goal: sprintGoal,
      isException: false, // Sunday-Sunday sprint
    });

    console.log(`✅ Sprint Created: ${sprintName}`);
    console.log(`   ID: ${sprint.id}`);
    console.log(`   URL: ${sprint.url}`);
    console.log(`   Start Date: ${sprint.dates.start.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${sprint.dates.end.toISOString().split('T')[0]}\n`);

    // Get next item to work on
    console.log('🔍 Finding next item to work on...\n');
    
    const nextItem = await getNextSprintItem(sprint.id);

    if (!nextItem) {
      console.log('ℹ️  No ready items in sprint yet.');
      console.log('   Add items to sprint using @add-to-sprint.md\n');
      return;
    }

    // Mark item as in progress
    await markItemInProgress(nextItem.id);

    // Get sprint progress
    const progress = await getSprintProgress(sprint.id);

    console.log('📋 Next item to work on:');
    console.log(`   Name: ${nextItem.name}`);
    console.log(`   Type: ${nextItem.type}`);
    console.log(`   Status: In progress`);
    console.log(`   URL: ${nextItem.url}`);
    
    if (nextItem.description) {
      const descPreview = nextItem.description.length > 200 
        ? nextItem.description.substring(0, 200) + '...' 
        : nextItem.description;
      console.log(`   Description: ${descPreview}`);
    }

    console.log(`\n📊 Sprint Progress:`);
    console.log(`   Total: ${progress.total}`);
    console.log(`   Ready: ${progress.ready}`);
    console.log(`   In Progress: ${progress.inProgress}`);
    console.log(`   Done: ${progress.done}`);
    console.log(`   Completion: ${progress.completionPercentage}%`);

    console.log('\n✨ Ready to work! The item is marked as "In progress".');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createAndWorkSprint();
}

