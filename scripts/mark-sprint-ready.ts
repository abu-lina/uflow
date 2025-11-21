/**
 * Mark sprint as ready for review
 */

const fs = require('fs');
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
  console.warn('⚠️  Could not load .env.local');
}

async function markSprintReady() {
  try {
    const { markSprintReadyForReview } = await import('../src/lib/notion/sprintHelpers');
    const { execSync } = require('child_process');
    
    const sprintId = '2af6163f-450b-818b-b3f3-ec3faf42f8b8';
    
    // Get current branch name
    let branchName: string | undefined;
    try {
      branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      branchName = 'sprint-sprint-2025-11-18';
    }
    
    console.log(`📋 Marking sprint as ready for review...`);
    console.log(`   Sprint ID: ${sprintId}`);
    console.log(`   Branch: ${branchName}\n`);
    
    await markSprintReadyForReview(sprintId, branchName);
    console.log('✅ Sprint marked as ready for review in Notion!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  markSprintReady();
}

