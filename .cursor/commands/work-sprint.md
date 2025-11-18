# Work Sprint

Start working on sprint items automatically, ordered by priority.

## Usage

```
@work-sprint.md [Sprint ID or URL]
```

## What It Does

1. **Fetches active sprint** from Notion
2. **Gets highest priority "Ready" item** (top of list)
3. **Marks item "In progress"**
4. **Provides full context** to Cursor AI:
   - Task name and description
   - Acceptance criteria
   - Expert review notes
   - Related epic information
5. **Tracks progress** as items are completed

## Workflow

### Starting Work
```
@work-sprint.md sprint-123
```

System will:
1. Find next "Ready" item
2. Mark it "In progress"
3. Provide context for Cursor to work on

### Completing Work
After completing an item, mark it done:
```
Complete current sprint item
```

Or use API:
```
POST /api/notion/work-sprint
{
  "sprintId": "sprint-123",
  "action": "complete",
  "itemId": "item-456"
}
```

System will:
1. Mark current item "Done"
2. Get next "Ready" item
3. Mark it "In progress"
4. Provide context for next item

## Priority Order

Items are processed by their position in Notion:
- **Top item** = Highest priority (worked on first)
- **Bottom item** = Lowest priority (worked on last)
- Only "Ready" items are picked up
- "In progress" items are skipped (already being worked on)

## Context Provided

For each sprint item, Cursor receives:
- **Task Name**: Clear task title
- **Description**: Full task description
- **Type**: Story, Task, or Bug
- **Status**: Current status
- **Expert Notes**: Review notes from refinement
- **Epic Link**: Related epic information
- **Acceptance Criteria**: From QA expert review

## Sprint Progress

The system tracks:
- Total items in sprint
- Ready items (not started)
- In progress items
- Done items
- Completion percentage

## Example

```
@work-sprint.md https://notion.so/sprint-123
```

Response:
```
Next item to work on:
- Name: "Add email verification"
- Type: "Story"
- Description: "Users should receive email verification after signup"
- Status: "In progress"
- Expert Notes: [Backend, Frontend, QA, Security]
- Progress: 2/10 done (20%)
```

## Continuous Work

You can work through the entire sprint:
1. Start with `@work-sprint.md`
2. Complete each item
3. System automatically moves to next
4. Track progress throughout
5. Review completed items

## Best Practices

- Work items in priority order
- Complete items fully before moving on
- Update status as you work
- Review expert notes before starting
- Test items before marking done

