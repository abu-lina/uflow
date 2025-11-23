# Break Down Epic

Automatically break down an epic into stories and tasks, with auto-refinement.

## Usage

```
@break-down-epic.md [Epic ID or URL]
```

Or specify auto-refinement:

```
@break-down-epic.md [Epic ID] [autoRefine: true/false]
```

## What It Does

1. **Fetches epic** from Notion
2. **Analyzes epic description** to identify features
3. **Generates user stories** (As a... I want... So that...)
4. **Creates technical tasks** for each story
5. **Links all items** to the epic via relation
6. **Auto-refines each item** (determines required experts)
7. **Returns breakdown summary**

## Story Generation

The system analyzes epic description and generates stories based on:
- User story patterns (As a... I want... So that...)
- Common feature keywords (auth, profile, search, create, etc.)
- Epic description content

## Task Generation

For each story, the system creates:
- **Frontend tasks**: UI components, forms, pages
- **Backend tasks**: API endpoints, database changes
- **Integration tasks**: Service integration, webhooks

## Auto-Refinement

Each generated item is automatically refined:
- Content analysis determines required experts
- "Refinement" field is updated
- Expert notes are added to task description
- Items are marked for expert review

## Example

```
@break-down-epic.md https://notion.so/workspace/epic-123
```

Or with epic ID:

```
@break-down-epic.md a1b2c3d4e5f6
```

## Output

Returns:
- List of created stories with IDs and URLs
- List of created tasks with IDs and URLs
- Total count of items created
- Refinement status for each item

## After Breakdown

1. Review generated stories and tasks in Notion
2. Experts will review and mark refinement complete
3. Items become "Ready" when all experts complete
4. Add ready items to sprint
5. Start working on sprint items

## Troubleshooting

### No Stories Generated
- Epic description may be too generic
- Add more detail to epic description
- Manually create stories if needed

### Refinement Failed
- Check that task was created successfully
- Verify Notion API token is valid
- Review task content for refinement keywords



