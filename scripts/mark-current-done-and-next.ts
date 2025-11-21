// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { resolve } from 'path';

try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key.trim()]) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
} catch (error) {
  // .env.local might not exist, that's okay
}

async function markCurrentDoneAndGetNext() {
  try {
    const { getActiveSprint } = await import('../src/lib/notion/sprintHelpers');
    const { getSprintIssues } = await import('../src/lib/notion/sprintHelpers');
    const { markItemDone, getNextSprintItem, getSprintProgress } = await import('../src/lib/notion/sprintWorkEngine');
    const { getCurrentBranch } = await import('../src/lib/git/branchHelpers');

    console.log('🔍 Finding active sprint...\n');
    const sprint = await getActiveSprint();
    
    if (!sprint) {
      console.error('❌ No active sprint found');
      process.exit(1);
    }

    const sprintId = sprint.id;
    const sprintName = (sprint.properties as any).Name?.title?.[0]?.text?.content || 'Sprint';
    console.log(`📋 Sprint: ${sprintName}`);
    console.log(`   URL: ${sprint.url}\n`);

    // Get all items
    const issues = await getSprintIssues(sprintId);
    const inProgressItems = issues.filter(i => i.status === 'In progress');
    
    if (inProgressItems.length === 0) {
      console.log('ℹ️  No in-progress items found.\n');
    } else if (inProgressItems.length === 1) {
      const item = inProgressItems[0];
      console.log(`📋 Current in-progress item: ${item.name}`);
      console.log(`   URL: ${item.url}\n`);
      
      // Mark as done
      const branchName = await getCurrentBranch();
      console.log(`✅ Marking item as done on branch: ${branchName}\n`);
      await markItemDone(item.id, branchName);
      console.log('✅ Item marked as done!\n');
    } else {
      console.log(`⚠️  Found ${inProgressItems.length} in-progress items:`);
      inProgressItems.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name}`);
        console.log(`      URL: ${item.url}`);
      });
      
      // Find "Form Handling" item (the one we just completed)
      const formHandlingItem = inProgressItems.find(item => 
        item.name.includes('Form Handling')
      );
      
      if (formHandlingItem) {
        console.log(`\n📝 Marking "Form Handling" item as done...\n`);
        const branchName = await getCurrentBranch();
        await markItemDone(formHandlingItem.id, branchName);
        console.log(`✅ "${formHandlingItem.name}" marked as done!\n`);
      } else {
        console.log('\n📝 Marking the first one as done...\n');
        const item = inProgressItems[0];
        const branchName = await getCurrentBranch();
        await markItemDone(item.id, branchName);
        console.log(`✅ "${item.name}" marked as done!\n`);
      }
    }

    // Get next item
    console.log('🔍 Looking for next item to work on...\n');
    const nextItem = await getNextSprintItem(sprintId);
    
    if (nextItem) {
      console.log('📋 Next item to work on:');
      console.log(`   Name: ${nextItem.name}`);
      console.log(`   Type: ${nextItem.type}`);
      console.log(`   Status: ${nextItem.status}`);
      console.log(`   URL: ${nextItem.url}\n`);
      
      if (nextItem.refinement && nextItem.refinement.length > 0) {
        console.log(`   Required Experts: ${nextItem.refinement.join(', ')}\n`);
      }
      
      if (nextItem.epicInfo) {
        console.log(`   Epic: ${nextItem.epicInfo.name}`);
        console.log(`   Epic URL: ${nextItem.epicInfo.url}\n`);
      }
    } else {
      console.log('ℹ️  No ready items found.\n');
      const progress = await getSprintProgress(sprintId);
      console.log('📊 Sprint Progress:');
      console.log(`   Total: ${progress.total}`);
      console.log(`   Ready: ${progress.ready}`);
      console.log(`   In Progress: ${progress.inProgress}`);
      console.log(`   Done: ${progress.done}`);
      console.log(`   Not Started: ${progress.notStarted}`);
      console.log(`   Completion: ${progress.completionPercentage}%\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  markCurrentDoneAndGetNext();
}

