/**
 * Mark sprint items as done
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

async function markItemsDone() {
  try {
    const { markItemDone } = await import('../src/lib/notion/sprintWorkEngine');
    const { execSync } = require('child_process');
    
    // Get current branch name
    let branchName: string | undefined;
    try {
      branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      branchName = undefined;
    }
    
    // Mark all 5 in-progress items as done
    const itemIds = [
      '2ae6163f-450b-817f-aa7b-f0989d7d17ab',
      '2ae6163f-450b-8195-8acf-e3ca1dfe1c44',
      '2ae6163f-450b-81b6-abcb-d89162ad0094',
      '2ae6163f-450b-81bc-84bc-f3c8216c82f3',
      '2ae6163f-450b-81e9-afa9-e2a3443df543'
    ];
    
    console.log(`📝 Marking ${itemIds.length} items as done...\n`);
    
    for (const itemId of itemIds) {
      try {
        await markItemDone(itemId, branchName);
        console.log(`✅ Marked item ${itemId.substring(0, 8)}... as done`);
      } catch (error) {
        console.error(`❌ Failed to mark ${itemId.substring(0, 8)}...:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  markItemsDone();
}

