# Notion API Setup for Task Creation

This document explains how to set up the Notion API integration for creating tasks.

## Overview

Instead of using the MCP tool (which has limitations with parent parameters), we use the Notion API directly through a Next.js API route. This ensures tasks are created correctly in the Issues database table.

## Setup Steps

### 1. Get Notion Integration Token

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Find your existing integration (or create a new one)
3. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Add Token to Environment Variables

Add to your `.env.local` file:

```bash
NOTION_API_TOKEN=secret_your_notion_integration_token_here
```

### 3. Verify Integration Access

Ensure your Notion integration:
- ✅ Is connected to the Issues database
- ✅ Has "Insert" and "Update" permissions
- ✅ Can create pages in the database

### 4. Test the API Route

Once set up, you can test by calling:

```bash
curl -X POST http://localhost:3000/api/notion/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Task",
    "type": "Story",
    "description": "This is a test task",
    "device": "Desktop"
  }'
```

Or use it from Cursor by asking me to create a task.

## How It Works

1. **API Route**: `/api/notion/create-task` handles the request
2. **Notion Client**: `src/lib/notion/client.ts` makes direct API calls
3. **Task Helpers**: `src/lib/notion/taskHelpers.ts` formats properties correctly
4. **Parent Database**: Uses `database_id` to ensure task appears in table

## Benefits Over MCP

- ✅ **Reliable**: Direct API calls work consistently
- ✅ **Proper Parent**: Tasks appear in database table immediately
- ✅ **Full Control**: All properties set correctly
- ✅ **Error Handling**: Better error messages and debugging

## Files Created

- `src/lib/notion/client.ts` - Notion API client
- `src/lib/notion/taskHelpers.ts` - Task creation helpers
- `src/app/api/notion/create-task/route.ts` - API route endpoint

## Usage

From Cursor, simply ask:

```
Create a task in Notion:
- Name: "Task name"
- Type: "Story" or "Bug"
- Description: "Task description"
- Device: "Desktop" or "Mobile"
```

I will call the API route which creates the task in your Issues database.

