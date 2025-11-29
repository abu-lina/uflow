# Epic Prioritization

## Overview

Epics in Notion are automatically prioritized based on a three-tier system that ensures the most important work is ranked highest.

## Prioritization Logic

Epics are sorted using the following criteria (in order):

1. **MoSCoW Priority** (highest weight)
   - `Must have` / `Must` = Priority 4
   - `Should have` / `Should` = Priority 3
   - `Could have` / `Could` = Priority 2
   - `Won't (v1)` = Priority 1

2. **Status Priority** (secondary weight)
   - `In progress` = Priority 3
   - `Not started` = Priority 2
   - `Done` = Priority 1

3. **Current Rank** (tiebreaker)
   - Lower existing rank = higher priority
   - Used only when MoSCoW and Status are identical

## How It Works

The prioritization algorithm:
1. Fetches all epics from the Epics database
2. Calculates a priority score for each epic
3. Sorts epics by score (descending)
4. Assigns new ranks (1 = highest priority)
5. Updates the `Rank` property in Notion

## Usage

### Via API Route

```bash
curl -X POST http://localhost:3000/api/notion/prioritize-epics \
  -H "Content-Type: application/json"
```

### Via Script

```bash
npx tsx scripts/prioritize-epics.ts
```

### Via Code

```typescript
import { prioritizeEpics } from './scripts/prioritize-epics';

await prioritizeEpics();
```

## Best Practices

### 1. **Use API Routes, Not MCP Tools Directly**

✅ **Good**: Use the Notion API client (`src/lib/notion/client.ts`) or API routes
```typescript
import { updatePage, queryDatabase } from '@/lib/notion/client';
```

❌ **Bad**: Don't use MCP tools in scripts
```typescript
// This won't work in a Node.js script
await mcp_Notion_notion-update-page({ ... });
```

### 2. **Use Existing Helpers**

✅ **Good**: Use helper functions from `src/lib/notion/epicHelpers.ts`
```typescript
import { updateEpic, getAllEpics } from '@/lib/notion/epicHelpers';
```

❌ **Bad**: Don't manually format Notion API properties
```typescript
// Don't do this - use helpers instead
properties.Rank = { number: rank };
```

### 3. **Handle Rate Limiting**

✅ **Good**: Add delays between updates
```typescript
for (const epic of epics) {
  await updateEpic(epic.id, { rank });
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### 4. **Error Handling**

✅ **Good**: Handle errors gracefully and continue
```typescript
try {
  await updateEpic(epic.id, { rank });
} catch (error) {
  console.error(`Failed to update ${epic.name}:`, error);
  // Continue with next epic
}
```

### 5. **Only Update When Changed**

✅ **Good**: Check if rank changed before updating
```typescript
if (epic.currentRank !== epic.newRank) {
  await updateEpic(epic.id, { rank: epic.newRank });
}
```

### 6. **Use Database Queries When Possible**

✅ **Good**: Query the database directly for better performance
```typescript
const epics = await getAllEpics(databaseId);
```

❌ **Bad**: Don't search all pages and filter
```typescript
// Less efficient
const allPages = await searchAllPages();
const epics = allPages.filter(hasEpicProperties);
```

## File Structure

- `src/app/api/notion/prioritize-epics/route.ts` - API route endpoint
- `src/lib/notion/epicHelpers.ts` - Epic helper functions
- `src/lib/notion/client.ts` - Notion API client
- `scripts/prioritize-epics.ts` - CLI script wrapper

## Environment Variables

Required:
- `NOTION_API_TOKEN` - Notion integration token
- `NOTION_EPICS_DATA_SOURCE_ID` - Epics database data source ID

Optional:
- `NEXT_PUBLIC_API_URL` - API base URL (default: http://localhost:3000)

## Troubleshooting

### Epics not updating

1. Check `NOTION_API_TOKEN` is set correctly
2. Verify integration has "Update" permissions on Epics database
3. Check API route logs for errors

### Wrong prioritization order

1. Verify MoSCoW values match expected format
2. Check Status values are correct
3. Ensure Rank property exists and is a number type

### Rate limiting errors

1. Add delays between updates (100ms recommended)
2. Reduce batch size if updating many epics
3. Use database queries instead of individual page fetches

