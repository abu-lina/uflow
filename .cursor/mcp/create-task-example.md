# Example: Creating a Task in Notion

This document shows the correct format for creating tasks using the Notion MCP API.

## Correct API Format

Based on the Notion MCP API, here's the correct format for creating a page in a database:

```json
{
  "pages": [
    {
      "parent": {
        "database_id": "2366163f-450b-8052-9b2f-f97e97f771db"
      },
      "properties": {
        "Name": "Add email verification",
        "Type": "User Story",
        "Status": "Not started",
        "Device": "Web"
      },
      "content": "# Add email verification\n\nUsers should receive email verification after signup."
    }
  ]
}
```

## Property Mapping

For the Issues database, properties map as follows:

- **Name** (title property): Use string directly - `"Name": "Task Name"`
- **Type** (select property): Use string value - `"Type": "User Story"`
- **Status** (select property): Use string value - `"Status": "Not started"`
- **Device** (select property): Use string value - `"Device": "Web"`

## Available Select Values

### Type
- "Story" (Note: Your database uses "Story" not "User Story")
- "Bug"

### Status
- "Not started"
- "Ready"
- "In progress"
- "Done"

### Device (Multi-select)
- "Desktop"
- "Mobile"

## Content Format

The `content` field uses Notion-flavored Markdown:

```markdown
# Task Title

Task description goes here.

## Additional Notes

- Bullet point 1
- Bullet point 2
```

## Testing

To test task creation, use this format in Cursor:

```
Create a task in Notion Issues database:
- Name: "Test Task"
- Type: "Task"
- Description: "This is a test task"
- Device: "Web"
```

Then I will use the Notion MCP API with the correct format to create it.

