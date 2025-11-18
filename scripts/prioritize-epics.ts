/**
 * Script to prioritize epics using the Notion API
 * 
 * This script uses the existing API route to prioritize epics.
 * Run with: npx tsx scripts/prioritize-epics.ts
 * 
 * Prioritization logic:
 * 1. MoSCoW priority: Must have/Must > Should have/Should > Could have/Could > Won't (v1)
 * 2. Status priority: In progress > Not started > Done
 * 3. Current Rank as tiebreaker (lower rank = higher priority)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function prioritizeEpics() {
  try {
    console.log('Prioritizing epics...');
    
    const response = await fetch(`${API_URL}/api/notion/prioritize-epics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to prioritize epics');
    }

    const result = await response.json();
    
    console.log(`\n✓ Successfully prioritized ${result.updated} of ${result.total} epics`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠ ${result.errors.length} epics failed to update:`);
      result.errors.forEach((error: { name: string; error: string }) => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }

    console.log('\nPrioritized epics:');
    result.epics.forEach((epic: { rank: number; name: string; moscow: string; status: string }) => {
      console.log(`  Rank ${epic.rank}: ${epic.name} (${epic.moscow}, ${epic.status})`);
    });

    return result;
  } catch (error) {
    console.error('Error prioritizing epics:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  prioritizeEpics()
    .then(() => {
      console.log('\n✓ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Failed:', error);
      process.exit(1);
    });
}

export { prioritizeEpics };
