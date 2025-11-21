/**
 * Script to get all in-progress items from the active sprint
 */

// Load environment variables
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

async function getInProgressItems() {
  try {
    const { getActiveSprint, getSprint } = await import('../src/lib/notion/sprintHelpers');
    const { getPage } = await import('../src/lib/notion/client');
    const { extractPageDescription } = await import('../src/lib/notion/sprintWorkEngine');

    const activeSprint = await getActiveSprint();
    if (!activeSprint) {
      console.error('❌ No active sprint found');
      process.exit(1);
    }

    const sprint = await getSprint(activeSprint.id);
    const issues = sprint.properties.Issues?.relation || [];

    console.log(`📋 Sprint: ${(sprint.properties as any).Name?.title?.[0]?.text?.content || 'Sprint'}\n`);

    const inProgressItems: Array<{ id: string; name: string; url: string; status: string }> = [];

    for (const issue of issues) {
      try {
        const page = await getPage(issue.id);
        const status = page.properties.Status?.status?.name || 'Not started';
        const name = page.properties.Name?.title?.[0]?.text?.content || 'Untitled';
        
        if (status === 'In progress') {
          inProgressItems.push({
            id: issue.id,
            name,
            url: page.url,
            status,
          });
        }
      } catch (error) {
        console.warn(`⚠️  Error fetching issue ${issue.id}:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (inProgressItems.length === 0) {
      console.log('ℹ️  No items in progress.');
    } else {
      console.log(`📝 Found ${inProgressItems.length} item(s) in progress:\n`);
      inProgressItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   URL: ${item.url}\n`);
      });
    }

    return inProgressItems;
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  getInProgressItems();
}

