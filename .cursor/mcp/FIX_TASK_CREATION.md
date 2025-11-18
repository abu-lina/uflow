# Fix: Task Creation Not Appearing in Table

## Problem

Tasks are being created but not appearing in the Issues database table view.

## Root Cause

When creating pages in a Notion database, you must specify the `parent` with the `data_source_id`, not just the `database_id`. Without the parent, pages are created as standalone pages at the workspace level.

## Solution

Always include the `parent` field with `data_source_id` when creating tasks:

```json
{
  "pages": [
    {
      "parent": {
        "data_source_id": "2366163f-450b-809a-ad3c-000b959449b7"
      },
      "properties": {
        "Name": "Task name",
        "Type": "Story",
        "Status": "Not started",
        "Device": "Desktop"
      },
      "content": "Task description"
    }
  ]
}
```

## Data Source ID

**Issues Database Data Source ID**: `2366163f-450b-809a-ad3c-000b959449b7`

This is different from the database ID. The data source ID is what you use to create pages that appear in the table.

## How to Get Data Source ID

1. Fetch the database using `notion-fetch` with the database ID
2. Look for the `data-source` tag in the response
3. Extract the ID from `collection://DATA_SOURCE_ID`

## Updated Create Task Format

When creating tasks, always use:

```json
{
  "parent": {
    "data_source_id": "2366163f-450b-809a-ad3c-000b959449b7"
  },
  "properties": {...},
  "content": "..."
}
```

This ensures the task appears in the Issues database table.

