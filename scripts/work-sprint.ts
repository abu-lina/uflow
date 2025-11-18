/**
 * Script to start working on a sprint
 * 
 * Usage: npx tsx scripts/work-sprint.ts [sprintId]
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

async function workSprint() {
  try {
    // Get sprint ID from command line argument, or find active sprint
    let sprintId = process.argv[2];
    
    // Import modules AFTER loading environment variables
    const { getNextSprintItem, markItemInProgress, getSprintProgress } = await import('../src/lib/notion/sprintWorkEngine');
    const { getSprint, getActiveSprint } = await import('../src/lib/notion/sprintHelpers');

    console.log('🔍 Finding next item to work on...\n');

    let sprint;
    
    if (sprintId) {
      // Use provided sprint ID
      sprint = await getSprint(sprintId);
    } else {
      // Try to find active sprint
      console.log('No sprint ID provided, looking for active sprint...\n');
      const activeSprint = await getActiveSprint();
      if (!activeSprint) {
        console.error('❌ Error: No active sprint found and no sprint ID provided');
        console.log('Usage: npx tsx scripts/work-sprint.ts [sprintId]');
        console.log('   Or activate a sprint in Notion first');
        process.exit(1);
      }
      sprint = activeSprint;
      sprintId = sprint.id;
    }

    const sprintName = (sprint.properties as any).Name?.title?.[0]?.text?.content || 'Sprint';
    console.log(`📋 Sprint: ${sprintName}`);
    console.log(`   URL: ${sprint.url}\n`);

    // Get next item
    const nextItem = await getNextSprintItem(sprintId);

    if (!nextItem) {
      console.log('ℹ️  No ready items in sprint.');
      console.log('   Items need to be marked as "Ready" status to be worked on.\n');
      
      // Show sprint progress
      const progress = await getSprintProgress(sprintId);
      console.log('📊 Sprint Progress:');
      console.log(`   Total: ${progress.total}`);
      console.log(`   Ready: ${progress.ready}`);
      console.log(`   In Progress: ${progress.inProgress}`);
      console.log(`   Done: ${progress.done}`);
      console.log(`   Not Started: ${progress.notStarted}`);
      console.log(`   Completion: ${progress.completionPercentage}%`);
      return;
    }

    // Mark item as in progress
    await markItemInProgress(nextItem.id);

    // Get updated progress
    const progress = await getSprintProgress(sprintId);

    console.log('📋 Next item to work on:');
    console.log(`   Name: ${nextItem.name}`);
    console.log(`   Type: ${nextItem.type}`);
    console.log(`   Status: In progress`);
    console.log(`   URL: ${nextItem.url}`);
    
    if (nextItem.refinement && nextItem.refinement.length > 0) {
      console.log(`   Required Experts: ${nextItem.refinement.join(', ')}`);
    }
    
    if (nextItem.epicInfo) {
      console.log(`   Epic: ${nextItem.epicInfo.name}`);
      console.log(`   Epic URL: ${nextItem.epicInfo.url}`);
    }
    
    if (nextItem.expertNotes) {
      console.log(`\n📝 Expert Review Notes:`);
      console.log(`${nextItem.expertNotes}\n`);
    }
    
    if (nextItem.acceptanceCriteria) {
      console.log(`✅ Acceptance Criteria:`);
      console.log(`${nextItem.acceptanceCriteria}\n`);
    }
    
    // Show description if no expert notes/criteria (or as additional context)
    if (nextItem.description && (!nextItem.expertNotes || !nextItem.acceptanceCriteria)) {
      const descPreview = nextItem.description.length > 500 
        ? nextItem.description.substring(0, 500) + '...' 
        : nextItem.description;
      console.log(`📄 Description:`);
      console.log(`${descPreview}\n`);
    }

    console.log(`📊 Sprint Progress:`);
    console.log(`   Total: ${progress.total}`);
    console.log(`   Ready: ${progress.ready}`);
    console.log(`   In Progress: ${progress.inProgress}`);
    console.log(`   Done: ${progress.done}`);
    console.log(`   Completion: ${progress.completionPercentage}%`);

    // Automated implementation workflow
    console.log('\n🤖 Starting automated implementation workflow...\n');
    
    try {
      const { performAutomatedWork } = await import('../src/lib/notion/automatedSprintWork');
      const { buildImplementationContext, formatContextAsPrompt } = await import('../src/lib/notion/implementationContext');
      const { markItemDone } = await import('../src/lib/notion/sprintWorkEngine');
      const readline = require('readline');

      // Build implementation context
      const context = await buildImplementationContext(nextItem);
      const prompt = formatContextAsPrompt(context);
      
      console.log('📋 Implementation Context Prepared:');
      console.log('─'.repeat(60));
      console.log(prompt);
      console.log('─'.repeat(60));
      console.log('\n💡 The AI will now implement this task based on the context above.');
      console.log('   Review the implementation and it will be validated automatically.\n');

      // Perform automated work (implementation happens via AI, then validation/testing)
      const workResult = await performAutomatedWork(nextItem);

      // Display results
      console.log('\n📊 Implementation Results:');
      console.log('─'.repeat(60));
      
      console.log('\n✅ Implementation:');
      console.log(`   Success: ${workResult.implementation.success ? 'Yes' : 'No'}`);
      if (workResult.implementation.errors.length > 0) {
        console.log(`   Errors: ${workResult.implementation.errors.join(', ')}`);
      }
      if (workResult.implementation.warnings.length > 0) {
        console.log(`   Warnings: ${workResult.implementation.warnings.join(', ')}`);
      }

      console.log('\n✅ Validation:');
      console.log(`   Passed: ${workResult.validation.passed ? 'Yes' : 'No'}`);
      for (const expertValidation of workResult.validation.expertValidations) {
        const status = expertValidation.passed ? '✓' : '✗';
        console.log(`   ${status} ${expertValidation.expert}: ${expertValidation.passed ? 'Passed' : 'Failed'}`);
        if (expertValidation.issues.length > 0) {
          expertValidation.issues.forEach(issue => {
            console.log(`      - ${issue}`);
          });
        }
      }
      if (workResult.validation.overallIssues.length > 0) {
        console.log(`   Overall Issues: ${workResult.validation.overallIssues.length}`);
      }

      console.log('\n✅ Tests:');
      console.log(`   Passed: ${workResult.tests.passed ? 'Yes' : 'No'}`);
      if (workResult.tests.errors.length > 0) {
        console.log(`   Errors: ${workResult.tests.errors.join('\n   ')}`);
      }

      console.log('\n✅ Linting:');
      console.log(`   Passed: ${workResult.linting.passed ? 'Yes' : 'No'}`);
      if (workResult.linting.errors.length > 0) {
        console.log(`   Errors: ${workResult.linting.errors.join('\n   ')}`);
      }

      console.log('\n─'.repeat(60));

      // Check if ready to complete
      if (workResult.readyToComplete) {
        console.log('\n✅ All checks passed! Ready to mark as done.');
      } else {
        console.log('\n⚠️  Some checks failed. Review the issues above.');
        console.log('   The item will remain "In progress" until issues are resolved.');
        return;
      }

      // Ask for confirmation
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('\n❓ Mark this item as done? (y/n): ', (ans: string) => {
          resolve(ans.trim().toLowerCase());
        });
      });

      rl.close();

      if (answer === 'y' || answer === 'yes') {
        await markItemDone(nextItem.id);
        console.log('\n✅ Item marked as done!');
        
        // Get next item
        const nextNextItem = await getNextSprintItem(sprintId);
        if (nextNextItem) {
          console.log(`\n📋 Next item: ${nextNextItem.name}`);
          console.log(`   Run the script again to work on the next item.`);
        } else {
          console.log('\n🎉 No more items in sprint!');
        }
      } else {
        console.log('\n⏸️  Item remains "In progress". You can mark it done manually later.');
      }

    } catch (error) {
      console.error('\n❌ Error during automated work:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      console.log('\n⚠️  Item remains "In progress". Fix errors and try again.');
      process.exit(1);
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
  workSprint();
}

