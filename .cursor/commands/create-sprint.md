# Create Sprint

Create a new sprint with Sunday-Sunday dates (or exception: today-Sunday).

## Usage

```
Create a sprint:
- Name: "Sprint 1"
- Goal: "Sprint goal description"
- Exception: false (optional, defaults to false)
```

Or use the API:

```
@create-sprint.md "Sprint 1" "Complete user authentication" false
```

## What It Does

1. **Calls API route** `/api/notion/create-sprint`
2. **Calculates dates**:
   - Normal: This Sunday to next Sunday
   - Exception: Today to next Sunday (for this week only)
3. **Creates sprint** in Notion Sprints database
4. **Sets properties** (Name, Start Date, End Date, Goal, Status)
5. **Returns sprint URL** and dates

## Sprint Dates

### Normal Sprint (Sunday-Sunday)
- **Start**: This Sunday (or today if it's Sunday)
- **End**: Next Sunday
- **Duration**: 7 days

### Exception Sprint (Today-Sunday)
- **Start**: Today
- **End**: Next Sunday
- **Duration**: Days until next Sunday
- Use for this week only

## Sprint Properties

- **Name**: Sprint name (required)
- **Goal**: Sprint goal description (optional)
- **Start Date**: Sprint start date (auto-calculated)
- **End Date**: Sprint end date (auto-calculated)
- **Status**: "Planning" (default), "Active", "Completed"
- **Issues**: Relation to Issues database (added later)

## Example

### Normal Sprint
```
Create a sprint:
- Name: "Sprint 1 - User Auth"
- Goal: "Complete user authentication and email verification"
- Exception: false
```

### Exception Sprint (This Week)
```
Create a sprint:
- Name: "Sprint 0 - Kickoff"
- Goal: "Set up project structure and initial features"
- Exception: true
```

## After Creation

1. Sprint is created with dates
2. Add items to sprint using `@add-to-sprint.md`
3. Start working on sprint using `@work-sprint.md`
4. Track progress using `@sprint-status.md`

## Next Steps

1. Create sprint
2. Add ready items to sprint (ordered by priority)
3. Start working on sprint items
4. Track progress throughout the week
5. Review completed items at end of sprint



