# Sprint Status

View current sprint status and progress.

## Usage

```
@sprint-status.md [Sprint ID or URL]
```

## What It Does

1. **Fetches sprint** from Notion
2. **Gets all sprint issues**
3. **Calculates progress**:
   - Total items
   - Ready items
   - In progress items
   - Done items
   - Completion percentage
4. **Lists items by status**
5. **Shows sprint dates** and goal

## Output

Returns:
- **Sprint Info**: Name, dates, goal, status
- **Progress**: Completion percentage and counts
- **Items by Status**:
  - Ready (not started)
  - In progress
  - Done
  - Not started (not ready)

## Example

```
@sprint-status.md sprint-123
```

Response:
```
Sprint: Sprint 1 - User Auth
Dates: 2024-01-07 to 2024-01-14
Status: Active
Goal: Complete user authentication

Progress: 40% (4/10 done)
- Ready: 3 items
- In progress: 1 item
- Done: 4 items
- Not started: 2 items

Ready Items:
1. Add email verification
2. Implement password reset
3. Create login page

In Progress:
1. User signup flow

Done:
1. User registration API
2. Email service integration
3. Password hashing
4. Session management
```

## Use Cases

- **Daily standup**: Check sprint progress
- **Sprint planning**: Review what's left
- **Sprint review**: See what was completed
- **Blockers**: Identify items stuck in progress

## Next Steps

After viewing status:
- Continue working on in-progress items
- Start next ready item with `@work-sprint.md`
- Review done items for quality
- Plan next sprint based on progress

