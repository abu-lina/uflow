# Update Task in Notion

Update an existing task in the Notion Issues database using the API route.

## Usage

Ask me to update a task with:
- **Task ID**: The Notion page ID (required)
- **Fields to update**: Any combination of the fields below

## Available Fields

### Basic Fields
- **name**: Update task name
- **type**: "Story" or "Bug"
- **status**: "Not started" | "Ready" | "In progress" | "Done"
- **device**: "Desktop" | "Mobile" | ["Desktop", "Mobile"]

### Refinement Fields
- **refinement**: Set refinement experts (replaces existing)
  - Options: "Backend", "Frontend", "QA", "Security", "Compliance", "UX/UI"
  - Can be a single value or array: `["Backend", "Frontend"]`
- **addRefinement**: Add refinement experts (adds to existing)
  - Same options as above
  - Merges with existing values
- **completedRefinement**: Set completed refinement (replaces existing)
- **addCompletedRefinement**: Add completed refinement (adds to existing)

## Examples

### Add UX/UI Refinement
```
Update task 2ae6163f-450b-8173-9480-cc00202c0fff:
- addRefinement: "UX/UI"
```

### Set Multiple Refinements
```
Update task 2ae6163f-450b-8173-9480-cc00202c0fff:
- refinement: ["Backend", "Frontend", "UX/UI"]
```

### Update Status and Add Refinement
```
Update task 2ae6163f-450b-8173-9480-cc00202c0fff:
- status: "Ready"
- addRefinement: "QA"
```

### Mark Refinement as Completed
```
Update task 2ae6163f-450b-8173-9480-cc00202c0fff:
- addCompletedRefinement: "UX/UI"
```

## What It Does

1. **Calls API route** `/api/notion/update-task`
2. **Fetches current values** for multi-select fields (if adding)
3. **Merges values** when using `addRefinement` or `addCompletedRefinement`
4. **Updates page** in Notion with new properties
5. **Returns task URL** for verification

## How It Works

The command uses a Next.js API route that:
- ✅ Validates task ID and update fields
- ✅ Handles multi-select merging for refinement fields
- ✅ Updates only specified fields (partial updates)
- ✅ Returns updated task information

## Getting Task ID

You can get the task ID from:
- The Notion page URL: `https://www.notion.so/Page-Name-{taskId}`
- The task ID is the UUID after the last dash in the URL
- Or use the full page ID from the previous create-task response

## Notes

- **Setting vs Adding**: Use `refinement` to replace all values, use `addRefinement` to add to existing
- **Multi-select**: Device and refinement fields support multiple values
- **Validation**: Invalid refinement values will return an error
- **Partial Updates**: Only specified fields are updated, others remain unchanged

