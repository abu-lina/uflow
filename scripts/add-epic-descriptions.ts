/**
 * Script to add structured descriptions to epics using the Notion API
 * 
 * This script uses the existing API route to add descriptions to epics.
 * Run with: npx tsx scripts/add-epic-descriptions.ts
 * 
 * Options:
 * - createStories: Also create stories in the Issues database (default: false)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ScriptOptions {
  createStories?: boolean;
  epicIds?: string[];
}

async function addEpicDescriptions(options: ScriptOptions = {}) {
  try {
    const { createStories = false, epicIds } = options;

    console.log('Adding structured descriptions to epics...');
    if (createStories) {
      console.log('(Also creating stories in Issues database)');
    }
    if (epicIds) {
      console.log(`(Filtering to ${epicIds.length} specific epics)`);
    }

    const response = await fetch(`${API_URL}/api/notion/add-epic-descriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        epicIds,
        createStories,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to add epic descriptions');
    }

    const result = await response.json();

    console.log(`\n✓ Successfully added descriptions to ${result.updated} of ${result.total} epics`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠ ${result.errors.length} epics failed to update:`);
      result.errors.forEach((error: { name: string; error: string }) => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }

    if (result.storiesCreated && result.storiesCreated.length > 0) {
      console.log(`\n✓ Created stories for ${result.storiesCreated.length} epics:`);
      result.storiesCreated.forEach((epic: { epicName: string; stories: Array<{ name: string; url: string }> }) => {
        console.log(`  - ${epic.epicName}: ${epic.stories.length} stories`);
        epic.stories.forEach((story) => {
          console.log(`    • ${story.name}: ${story.url}`);
        });
      });
    }

    console.log('\nUpdated epics:');
    result.epics.forEach((epic: { name: string; description: string }) => {
      console.log(`  - ${epic.name}`);
      console.log(`    ${epic.description}`);
    });

    return result;
  } catch (error) {
    console.error('Error adding epic descriptions:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ScriptOptions = {};

if (args.includes('--create-stories')) {
  options.createStories = true;
}

// Check for epic IDs (format: --epic-ids id1,id2,id3)
const epicIdsIndex = args.indexOf('--epic-ids');
if (epicIdsIndex !== -1 && args[epicIdsIndex + 1]) {
  options.epicIds = args[epicIdsIndex + 1].split(',').map((id) => id.trim());
}

// Run if called directly
if (require.main === module) {
  addEpicDescriptions(options)
    .then(() => {
      console.log('\n✓ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Failed:', error);
      process.exit(1);
    });
}

export { addEpicDescriptions };



