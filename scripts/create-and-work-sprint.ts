/**
 * Script to create a sprint and start working on it
 * 
 * Usage: npx tsx scripts/create-and-work-sprint.ts "Sprint Name" "Sprint Goal" [exception]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local if it exists
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const sprintName = process.argv[2] || 'Sprint - Feature Development';
const sprintGoal = process.argv[3] || 'Complete sprint items';
const isException = process.argv[4] === 'true';

async function createAndWorkSprint() {
  // Import after env vars are loaded
  const { createSprint } = await import('../src/lib/notion/sprintHelpers');
  const { createBranch } = await import('../src/lib/git/branchHelpers');
  const { getNextSprintItem, markItemInProgress, getSprintProgress } = await import('../src/lib/notion/sprintWorkEngine');
  try {
    console.log('🚀 Creating sprint...\n');
    console.log(`Name: ${sprintName}`);
    console.log(`Goal: ${sprintGoal}`);
    console.log(`Exception: ${isException}\n`);

    // Create sprint
    const sprint = await createSprint({
      name: sprintName,
      goal: sprintGoal,
      isException,
    });

    console.log('✅ Sprint created successfully!');
    console.log(`Sprint ID: ${sprint.id}`);
    console.log(`Sprint URL: ${sprint.url}`);
    console.log(`Start Date: ${sprint.dates.start.toISOString().split('T')[0]}`);
    console.log(`End Date: ${sprint.dates.end.toISOString().split('T')[0]}`);

    // Create git branch
    console.log('\n🌿 Creating git branch...');
    const branchResult = await createBranch(sprintName);
    
    if (branchResult.success) {
      console.log(`✅ Branch created: ${branchResult.branchName}`);
    } else {
      console.log(`⚠️  Branch creation failed: ${branchResult.error}`);
    }

    console.log('\n📋 Getting next sprint item...\n');

    // Get next item to work on
    const nextItem = await getNextSprintItem(sprint.id);

    if (!nextItem) {
      console.log('ℹ️  No ready items in sprint yet.');
      console.log('   Add items to sprint using @add-to-sprint.md\n');
      return;
    }

    // Mark item as in progress
    console.log('🎯 Starting work on next item...\n');
    await markItemInProgress(nextItem.id);

    // Get progress
    const progress = await getSprintProgress(sprint.id);

    // Display item details
    console.log('📝 NEXT ITEM TO WORK ON:\n');
    console.log(`Name: ${nextItem.name}`);
    console.log(`Type: ${nextItem.type || 'N/A'}`);
    console.log(`Status: In progress`);
    if (nextItem.description) {
      console.log(`Description: ${nextItem.description}`);
    }
    if (nextItem.url) {
      console.log(`URL: ${nextItem.url}`);
    }
    console.log('\n📊 SPRINT PROGRESS:');
    console.log(`Total: ${progress.total}`);
    console.log(`Ready: ${progress.ready}`);
    console.log(`In Progress: ${progress.inProgress}`);
    console.log(`Done: ${progress.done}`);
    console.log(`Completion: ${progress.completionPercentage}%\n`);

    console.log('✅ Ready to start working!');
    console.log(`Sprint ID: ${sprint.id}`);
    console.log(`Current Item ID: ${nextItem.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

createAndWorkSprint();
