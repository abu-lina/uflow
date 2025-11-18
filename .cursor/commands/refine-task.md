# Refine Notion Task

Refine a task from Notion using expert rules to ensure it's ready for development.

## Usage

```
@refine-task.md [Notion task URL or ID]
```

## What It Does

1. **Calls API route** `/api/notion/auto-refine`
2. **Fetches task** from Notion
3. **Analyzes task content** using automatic refinement logic:
   - Keyword analysis (auth → Security, data → Compliance, API → Backend, UI → Frontend/UX/UI)
   - Task type analysis (Story → Backend+Frontend+QA, Task → Backend/Frontend+QA)
   - Content pattern matching
4. **Updates "Refinement" field** with required experts
5. **Generates expert review notes** from expert rules in `.cursor/rules/*-expert.mdc` files
6. **Generates acceptance criteria** automatically using Given-When-Then format based on task content
7. **Writes all output to Description field** in Notion (expert notes and acceptance criteria)
8. **Evaluates "Ready?" status** based on completed refinements

## Batch Refinement

Refine multiple tasks at once:

```
@refine-task.md [task-id-1] [task-id-2] [task-id-3]
```

Or use the batch API:

```
POST /api/notion/batch-refine
{
  "taskIds": ["id-1", "id-2", "id-3"]
}
```

## Example

```
@refine-task.md https://notion.so/workspace/a1b2c3d4e5f6
```

Or with just the ID:

```
@refine-task.md a1b2c3d4e5f6
```

## Expert Selection Logic

### Task Type
- **Epic**: All experts required
- **User Story**: QA + Backend + Frontend (Security/Compliance if sensitive)
- **Bug**: QA + Backend/Frontend (depending on area)
- **Task**: Backend/Frontend + QA (if user-facing)

### Content Analysis
- Keywords like "auth", "login", "session" → Security Expert
- Keywords like "data", "privacy", "GDPR" → Compliance Expert
- Keywords like "API", "database", "query" → Backend Expert
- Keywords like "UI", "component", "design" → Frontend Expert
- All tasks → QA Expert (for acceptance criteria)

## Output

After refinement, the task will have:

- **Refinement field**: Updated with required experts
- **Expert notes**: Automatically generated from expert rules and added to Description field
- **Acceptance Criteria**: Automatically generated with Given-When-Then format, test scenarios, and quality requirements, added to Description field
- **Ready? status**: Evaluated based on completed refinements

All generated content is based on expert rules from `.cursor/rules/*-expert.mdc` files, not placeholders.

## Generated Content

The refinement process automatically generates content based on expert rules:

- **Expert Notes**: Generated from expert rule files (`.cursor/rules/*-expert.mdc`), including:
  - Relevant responsibilities from the expert's domain
  - Review criteria that must be checked
  - Expert-specific guidance based on task content
- **Acceptance Criteria**: Automatically generated with:
  - Given-When-Then format based on task content and context
  - Test scenarios (happy path, edge cases, error scenarios)
  - Quality requirements (performance, accessibility, browser compatibility)
  - Expert-specific requirements for each required expert
- **All content is written to the Description field** in Notion automatically

## Next Steps

1. Review expert notes in Notion (in the Description field)
2. Review acceptance criteria in Notion (in the Description field)
3. Each expert completes their review
4. Experts mark themselves complete in "Completed Refinement"
5. When all experts are complete, task is marked "Ready"
6. Task can be assigned to a sprint and picked up for development

## Troubleshooting

### Task Not Found
- Verify the URL/ID is correct
- Ensure the integration has access to the database
- Check that the task exists in Notion

### Experts Not Selected
- Review task content and type
- Manually add required experts if needed
- Check expert rule files exist

### Ready Status Not Updating
- Verify "Ready?" formula in Notion
- Check that all required experts are complete
- Ensure field names match exactly

