# Solution: Creating Tasks in Issues Database Table

## Current Issue

The Notion MCP `create-pages` tool creates pages, but they don't appear in the Issues database table because the `parent` parameter isn't being properly passed through the MCP wrapper.

## Workaround Solutions

### Option 1: Manual Creation in Notion (Recommended for Now)

1. Open your Issues database in Notion
2. Click "+ New" to create a new row
3. Fill in the properties:
   - **Name**: Task title
   - **Type**: Story or Bug
   - **Status**: Not started
   - **Device**: Desktop or Mobile
4. Add description in the page content

This ensures the task appears in the table immediately.

### Option 2: Create Then Move (If MCP Supports Move)

1. Create the task using MCP (it will be a standalone page)
2. Use `notion-move-pages` to move it to the Issues database
3. The task will then appear in the table

### Option 3: Use Notion API Directly (Advanced)

If you have access to the Notion API directly (not through MCP), you can use:

```typescript
const response = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    parent: {
      database_id: '2366163f-450b-8052-9b2f-f97e97f771db'
    },
    properties: {
      'Name': {
        title: [{ text: { content: 'Task name' } }]
      },
      'Type': {
        select: { name: 'Story' }
      },
      'Status': {
        status: { name: 'Not started' }
      },
      'Device': {
        multi_select: [{ name: 'Desktop' }]
      }
    }
  })
});
```

## Root Cause

The Notion MCP tool's `create-pages` function may not properly support the `parent` parameter, or it needs to be specified in a way that the MCP wrapper doesn't currently expose.

## Recommended Approach

**For now, use Option 1 (Manual Creation)** until we can verify the correct MCP format or implement Option 3.

After creating manually:
1. Use `@refine-task.md` with the task URL to automatically refine it
2. Experts will review and mark refinement complete
3. Task becomes ready for development

## Future Fix

We need to either:
1. Verify the correct MCP format for including parent
2. Use the Notion API directly instead of MCP
3. Implement a move operation after creation

