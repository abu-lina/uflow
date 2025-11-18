# Create Task in Notion

Create a new task in the Notion Issues database using the API route.

## Usage

Simply ask me to create a task with:
- **Name**: Task title (required)
- **Type**: "Story", "Task", or "Bug" (required)
- **Description**: Task description (optional)
- **Device**: "Desktop" or "Mobile" (optional, defaults to "Desktop")
- **Status**: "Not started" (default)
- **Epic ID**: Epic to link to (optional)
- **Auto-refine**: Automatically refine after creation (optional, defaults to false)

## Example

```
Create a task in Notion:
- Name: "Add email verification"
- Type: "Story"
- Description: "Users should receive email verification after signup"
- Device: "Desktop"
```

## What It Does

1. **Calls API route** `/api/notion/create-task`
2. **Creates page** in Notion Issues database with correct parent
3. **Sets all properties** (Name, Type, Status, Device)
4. **Adds description** as page content
5. **Returns task URL** for further refinement

## How It Works

The command uses a Next.js API route that calls the Notion API directly (not MCP). This ensures:
- ✅ Task appears in the Issues database table
- ✅ All properties are set correctly
- ✅ Parent database is properly assigned
- ✅ Reliable creation every time

## After Creation

Once the task is created:
1. Task URL will be provided
2. Task appears in your Issues database table
3. If auto-refine is enabled, task is automatically refined
4. Otherwise, use `@refine-task.md` with the task URL to refine it
5. Experts will review and mark refinement complete
6. Task will be marked "Ready" when all experts are done
7. Add ready task to sprint when ready for work

## Epic Linking

To link a task to an epic:
```
Create a task:
- Name: "Task name"
- Type: "Task"
- Epic ID: "epic-id-123"
```

The task will be linked to the epic via the "⭐ Epics" relation field.

## Setup Required

Before using this command, ensure:
1. **Notion Integration Token** is set in `.env.local`:
   ```
   NOTION_API_TOKEN=secret_your_token_here
   ```
2. **Integration is connected** to your Issues database in Notion
3. **Integration has permissions** to create pages

## Troubleshooting

### API Route Not Found
- Ensure the API route exists at `/api/notion/create-task`
- Check that the server is running

### Missing Token Error
- Add `NOTION_API_TOKEN` to your `.env.local` file
- Get token from https://www.notion.so/my-integrations

### Task Not Appearing in Table
- Verify the database ID is correct
- Check that integration has access to the database
- Ensure parent is set correctly (should be automatic now)

### Type Options
- Your database only has "Story" and "Bug" options
- If you need "Epic" or "Task", add them to your Notion database first

### Device Options
- Your database has "Desktop" and "Mobile" options
- Use "Desktop" for web tasks, "Mobile" for mobile tasks
