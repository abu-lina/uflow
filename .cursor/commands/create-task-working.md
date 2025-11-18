# Create Task in Notion (Working Format)

This command creates tasks that appear in the Issues database table.

## Correct Format

When creating a task, I must include the `parent` field with the `data_source_id`:

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
      "content": "Task description in Markdown"
    }
  ]
}
```

## Data Source ID

**Issues Database Data Source ID**: `2366163f-450b-809a-ad3c-000b959449b7`

This is different from the database ID. Always use the data source ID when creating pages.

## Usage

Ask me to create a task and I will use this format with the parent included.

Example:
```
Create a task:
- Name: "Add email verification"
- Type: "Story"
- Description: "Users should receive email verification after signup"
- Device: "Desktop"
```

I will create it with the correct parent so it appears in your Issues table.

