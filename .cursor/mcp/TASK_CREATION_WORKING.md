# Working Task Creation Format

This document shows the **working** format for creating tasks in your Notion Issues database.

## Successfully Created Task

**Task URL**: https://www.notion.so/2ae6163f450b810db11af129c0a1ae14

## Working API Call

**IMPORTANT**: You must specify the `parent` with `data_source_id` to create the page in the correct database table.

```json
{
  "pages": [
    {
      "parent": {
        "data_source_id": "2366163f-450b-809a-ad3c-000b959449b7"
      },
      "properties": {
        "Name": "Add email verification",
        "Type": "Story",
        "Status": "Not started",
        "Device": "Desktop"
      },
      "content": "# Add email verification\n\nUsers should receive email verification after signup."
    }
  ]
}
```

**Data Source ID**: `2366163f-450b-809a-ad3c-000b959449b7` (Issues database)

## Key Findings

1. **Parent is REQUIRED**: Must specify `parent` with `data_source_id` to create pages in the database table
2. **Simple property format**: Properties use direct string values
3. **Device is string**: Even though it's multi-select in Notion, use a single string value
4. **Content uses Markdown**: Description goes in the `content` field as Markdown
5. **Data Source vs Database ID**: Use `data_source_id` (from collection:// URL), not `database_id`

## Database Schema (Actual)

Based on fetching your database:

- **Name**: Title property (string)
- **Type**: Select - "Story" or "Bug" only
- **Status**: Status property - "Not started", "Ready", "In progress", "Done"
- **Device**: Multi-select - "Desktop" or "Mobile"
- **Estimation**: Number (optional)
- **⭐ Features**: Relation to Features database (optional)
- **Refinement**: Multi-select - Backend, Frontend, QA, Security, Compliance, UX/UI
- **Completed Refinement**: Multi-select - same options as Refinement
- **Ready?**: Formula (auto-calculated)

## Usage

To create a task, simply ask:

```
Create a task in Notion:
- Name: "Task name"
- Type: "Story" or "Bug"
- Description: "Task description"
- Device: "Desktop" or "Mobile"
```

I will create it using the working format above.

## Next Steps After Creation

1. Task is created with Name and content
2. Properties (Type, Status, Device) may need manual setting in Notion
3. Use `@refine-task.md` with the task URL to refine it
4. Experts will review and update refinement fields

