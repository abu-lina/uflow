# Add to Sprint

Add issues (stories/tasks) to a sprint.

## Usage

```
Add to sprint:
- Sprint ID: "sprint-id-123"
- Issue IDs: ["issue-1", "issue-2", "issue-3"]
```

Or use the API:

```
@add-to-sprint.md [Sprint ID] [Issue ID 1] [Issue ID 2] ...
```

## What It Does

1. **Calls API route** `/api/notion/add-to-sprint`
2. **Fetches sprint** from Notion
3. **Merges new issues** with existing issues (no duplicates)
4. **Updates sprint** with all issues
5. **Returns summary** (added count, total count)

## Priority Order

Issues in Notion are ordered by their position in the database:
- **Top items** = Highest priority
- **Bottom items** = Lower priority
- When working on sprint, items are processed top-to-bottom

## Requirements

- Issues must have status "Ready" to be worked on
- Issues can be added to sprint even if not ready
- Only "Ready" items will be picked up by work-sprint

## Example

```
Add to sprint:
- Sprint ID: "a1b2c3d4e5f6"
- Issue IDs: ["story-1", "task-1", "task-2"]
```

Or with URLs:

```
@add-to-sprint.md sprint-123 https://notion.so/story-1 https://notion.so/task-1
```

## After Adding

1. Issues are linked to sprint
2. Sprint shows all issues in relation
3. Use `@work-sprint.md` to start working
4. Items will be processed by priority (top to bottom)

## Best Practices

- Add items in priority order (most important first)
- Only add "Ready" items to active sprints
- Review sprint scope before starting work
- Keep sprint size manageable (5-10 items per week)

