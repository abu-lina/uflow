# Work Sprint

Automatically implement sprint items using expert rules, validate, test, and require confirmation before marking done.

## Usage

```
@work-sprint.md [Sprint ID or URL]
```

## What It Does

1. **Fetches active sprint** from Notion (or uses provided sprint ID)
2. **Gets highest priority "Ready" item** (top of list)
3. **Marks item "In progress"**
4. **Builds implementation context** from:
   - Task name, description, and acceptance criteria
   - Expert review notes from refinement
   - Expert rules from `.cursor/rules/*-expert.mdc` files
   - Related epic information
5. **Implements the task** using AI with expert rules as guidelines
6. **Validates implementation** against expert review criteria
7. **Runs automated tests** (if available)
8. **Runs linting and type checking**
9. **Shows results** and asks for confirmation before marking done
10. **Tracks progress** as items are completed

## Workflow

### Automated Implementation Workflow

When you run `@work-sprint.md`, the system:

1. **Finds next "Ready" item** from active sprint
2. **Marks it "In progress"**
3. **Loads expert rules** for required experts from `.cursor/rules/`
4. **Builds implementation context** combining:
   - Task details and acceptance criteria
   - Expert-specific implementation guidelines
   - Validation criteria from expert rules
5. **Displays context** for AI implementation
6. **AI implements the task** following expert guidelines
7. **Validates implementation** against expert review criteria
8. **Runs automated tests** (`npm test`)
9. **Runs linting and type checking** (`npm run lint` and `npm run type-check`)
10. **Shows results** with pass/fail status for each check
11. **Asks for confirmation** before marking as done
12. **Marks item "Done"** if confirmed and all checks passed

### Error Handling

If any step fails:
- **Stops immediately** and reports the error
- **Keeps item "In progress"** status
- **Waits for user intervention** before continuing
- **Shows detailed error information** for debugging

### Confirmation

Before marking an item as done, the system asks:
```
❓ Mark this item as done? (y/n):
```

- **Yes (y)**: Marks item as done and shows next item
- **No (n)**: Keeps item in progress for manual completion later

### API Access

Use the automated work API for programmatic access:

```
POST /api/notion/automated-work-sprint
{
  "sprintId": "sprint-123",  // Optional - finds active sprint if omitted
  "itemId": "item-456",       // Optional - gets next item if omitted
  "autoConfirm": false        // Optional - auto-mark done if all checks pass
}
```

Response includes:
- Implementation context and prompt
- Validation results per expert
- Test results
- Linting results
- Ready-to-complete status

## Priority Order

Items are processed by their position in Notion:
- **Top item** = Highest priority (worked on first)
- **Bottom item** = Lowest priority (worked on last)
- Only "Ready" items are picked up
- "In progress" items are skipped (already being worked on)

## Context Provided

For each sprint item, the system builds comprehensive context:

### Task Information
- **Task Name**: Clear task title
- **Description**: Full task description
- **Type**: Story, Task, or Bug
- **Status**: Current status
- **Acceptance Criteria**: From QA expert review
- **Expert Notes**: Review notes from refinement
- **Epic Link**: Related epic information

### Expert Rules Integration
- **Required Experts**: Determined from refinement field or inferred from task type
- **Implementation Guidelines**: Extracted from expert rules:
  - Responsibilities sections
  - Common Patterns sections
  - Standards sections
- **Validation Criteria**: Extracted from expert rules:
  - Review Criteria sections
  - Standards sections

### Expert Rules Source
Rules are loaded from `.cursor/rules/*-expert.mdc` files:
- `backend-expert.mdc`
- `frontend-expert.mdc`
- `qa-expert.mdc`
- `security-expert.mdc`
- `compliance-expert.mdc`
- `ux-ui-expert.mdc`

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

## Validation and Testing

The system automatically validates and tests each implementation:

### Expert Validation
- Checks implementation against each required expert's review criteria
- Validates against expert standards
- Reports issues per expert
- Overall validation status

### Automated Testing
- Runs `npm test` to execute test suite
- Reports test pass/fail status
- Shows test errors if any

### Linting and Type Checking
- Runs `npm run type-check` for TypeScript validation
- Runs `npm run lint` for code quality checks
- Reports all linting and type errors
- Blocks completion if critical errors exist

## Best Practices

- **Review implementation context** before AI implements
- **Check validation results** to ensure expert criteria are met
- **Review test results** before confirming completion
- **Fix linting errors** before marking done
- **Work items in priority order** (system handles this automatically)
- **Complete items fully** before moving to next (system enforces this)

## Troubleshooting

### No Active Sprint Found
- Create or activate a sprint in Notion (status = "In progress")
- Or provide sprint ID: `@work-sprint.md [sprint-id]`

### Tests Fail
- Review test output in the results
- Fix failing tests
- Re-run the script

### Linting Errors
- Review linting output
- Fix reported errors
- Re-run the script

### Validation Fails
- Review expert validation issues
- Ensure implementation follows expert guidelines
- Update code to address validation issues

