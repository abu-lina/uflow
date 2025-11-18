# Refine Tasks from Top Epic

Automatically refine all tasks in the top-ranked epic (rank 1) in Notion.

## Usage

```
@refine-tasks-from-top-epic.md
```

Or run via npm script:

```bash
npm run refine-tasks-from-top-epic
```

## What It Does

1. **Fetches all epics** sorted by rank from Notion
2. **Finds the top epic** (rank 1, or first epic if no rank 1 exists)
3. **Gets all tasks/stories** linked to that epic
4. **Batch refines all tasks** using the refinement API
5. **Updates each task** with:
   - Required experts in "Refinement" field
   - Expert review notes in "Description" property
   - Acceptance criteria in "Description" property
   - Experts who performed the refinement in "Completed Refinement" field
6. **Returns summary** with task URLs and refinement status

## Refinement Process

Each task is automatically refined using the same logic as `@refine-task.md`:

- **Content analysis** determines required experts
- **Expert notes** generated from expert rules (`.cursor/rules/*-expert.mdc`)
- **Acceptance criteria** generated in Given-When-Then format
- **All content written** to the task's Description property in Notion

## What Gets Updated in Notion

For each task:

1. **"Refinement" field** (multi-select)
   - Set with required experts: Backend, Frontend, QA, Security, Compliance, UX/UI

2. **"Description" property** (rich_text)
   - Expert Review Notes section
   - Acceptance Criteria section

3. **"Completed Refinement" field** (multi-select)
   - Automatically updated with all experts who performed the refinement
   - Merges with existing values (doesn't overwrite)

## Example

```
@refine-tasks-from-top-epic.md
```

## Output

The command provides:

- Top epic information (name, rank, MoSCoW, status, URL)
- List of tasks found for the epic
- Refinement summary (total, successful, failed)
- Detailed results for each task:
  - Task name and URL
  - Required experts
  - Success/failure status
- Links to view results in Notion

## Requirements

- Next.js dev server running (`npm run dev`) or `NEXT_PUBLIC_API_URL` set to production API
- Top epic must have tasks/stories already created (use `@break-down-epic.md` if needed)
- Notion API token configured in environment variables

## After Refinement

1. Check task URLs in the output to view refined tasks in Notion
2. Review expert notes and acceptance criteria in each task's Description
3. Experts complete their reviews and mark "Completed Refinement"
4. Tasks become "Ready" when all experts complete
5. Add ready tasks to sprint for development

## Troubleshooting

### No Tasks Found

- Epic may not have been broken down yet
- Run `@break-down-epic.md` first to create tasks
- Verify tasks are linked to the epic via the "Epic" relation field

### Refinement Failed

- Check that Notion API token is valid
- Verify the API server is running
- Review task content for refinement keywords
- Check individual task URLs for error details

### Top Epic Not Found

- Verify epics exist in the Epics database
- Check that epics have been prioritized (ranks assigned)
- Run epic prioritization if needed

## Related Commands

- `@refine-task.md` - Refine a single task
- `@break-down-epic.md` - Break down epic into tasks
- `@update-refinement.md` - Update refinement status manually

