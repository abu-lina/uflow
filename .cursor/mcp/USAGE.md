# Notion Backlog Usage Guide

How to use the Notion MCP integration for backlog management in Cursor.

## Overview

The Notion MCP integration enables Cursor to:
- Read tasks from Notion
- Automatically refine tasks using expert rules
- Update refinement status
- Mark tasks as ready for development
- Create epics and manage sprints

## Workflow

### 1. Create Task in Notion

1. Open your Notion workspace
2. Go to the **Issues** database
3. Create a new page
4. Fill in the required fields:
   - **Name**: Task title
   - **Type**: Epic, User Story, Bug, or Task
   - **Status**: Not started
   - **Device**: Web, Mobile, or Both
   - **Features**: Link to related feature (if applicable)

### 2. Refine Task in Cursor

1. In Cursor, use the command: `@refine-task.md`
2. Provide the Notion task URL or ID
3. Cursor will:
   - Read the task from Notion
   - Review it using expert rules
   - Update the "Refinement" field with required experts
   - Add initial refinement notes

### 3. Expert Review

Each expert (Security, Compliance, QA, Backend, Frontend) reviews the task:

1. Cursor uses the corresponding expert rule (`.cursor/rules/*-expert.mdc`)
2. Expert checks the task against their criteria
3. Expert marks their review as complete in "Completed Refinement"
4. Expert adds notes or requirements to the task

### 4. Mark as Ready

When all required experts have completed their review:

1. Cursor evaluates the "Ready?" formula
2. If all refinements are complete, task is marked as "Ready"
3. Status is updated to "Ready"
4. Task is ready for development

## Commands

### Refine Task

**Command**: `@refine-task.md`

**Usage**:
```
@refine-task.md [Notion task URL or ID]
```

**What it does**:
- Reads task from Notion
- Reviews task using expert rules
- Updates "Refinement" field
- Adds refinement notes
- Evaluates "Ready?" status

**Example**:
```
@refine-task.md https://notion.so/workspace/task-id
```

### Create Epic

**Command**: `@create-epic.md`

**Usage**:
```
@create-epic.md [Epic name] [Description]
```

**What it does**:
- Creates new epic in Notion Issues database
- Sets type to "Epic"
- Links to Features database (if specified)
- Sets initial status to "Not started"

**Example**:
```
@create-epic.md "User Authentication" "Complete authentication system with email verification"
```

### Update Refinement

**Command**: `@update-refinement.md`

**Usage**:
```
@update-refinement.md [Task URL/ID] [Expert name] [Notes]
```

**What it does**:
- Updates "Completed Refinement" field
- Adds expert notes to task
- Re-evaluates "Ready?" status
- Updates status if ready

**Example**:
```
@update-refinement.md task-id Security "All security requirements met. No issues found."
```

## Expert Refinement Process

### Automatic Refinement

When you use `@refine-task.md`, Cursor automatically:

1. **Reads the task** from Notion
2. **Analyzes the task** using all expert rules
3. **Determines required experts** based on task type and content
4. **Updates "Refinement" field** with required experts
5. **Adds initial notes** from each expert

### Manual Expert Review

Each expert can review independently:

1. **Security Expert**: Reviews for security implications
2. **Compliance Expert**: Reviews for legal/compliance requirements
3. **QA Expert**: Defines acceptance criteria and test strategy
4. **Backend Expert**: Reviews API design and database requirements
5. **Frontend Expert**: Reviews UI/UX and component design

### Expert Completion

When an expert completes their review:

1. Expert marks their name in "Completed Refinement"
2. Expert adds notes or requirements
3. Cursor re-evaluates "Ready?" status
4. If all experts are complete, task is marked "Ready"

## Task Types

### Epic
- Large feature or initiative
- Contains multiple user stories
- Requires all expert reviews
- Links to Features database

### User Story
- Feature from user perspective
- Format: "As a [user], I want [feature], so that [benefit]"
- Requires QA, Backend, and Frontend review
- May require Security/Compliance if sensitive

### Bug
- Defect or issue
- Requires QA review (reproduction steps)
- May require Backend/Frontend review (depending on area)
- Usually doesn't require Security/Compliance

### Task
- Technical task or improvement
- Requires Backend or Frontend review (depending on area)
- May require QA review (if user-facing)
- Usually doesn't require Security/Compliance

## Best Practices

### Task Creation
- Write clear, descriptive titles
- Include context and background
- Link to related features
- Specify device/platform requirements

### Refinement
- Let Cursor do initial refinement automatically
- Review expert notes and add clarifications
- Ensure all required experts review
- Don't mark as ready until all experts approve

### Expert Review
- Be thorough in your review
- Add specific requirements, not just "looks good"
- Document edge cases and considerations
- Mark as complete only when satisfied

### Status Management
- Keep status updated as work progresses
- Move to "In progress" when development starts
- Move to "Done" when complete and tested
- Update related features and sprints

## Integration with Development

### Before Development
1. Task is created in Notion
2. Task is refined and marked "Ready"
3. Task is assigned to a sprint
4. Developer picks up the task

### During Development
1. Status updated to "In progress"
2. Developer references expert notes
3. Developer implements requirements
4. Developer updates task with progress

### After Development
1. Code is reviewed
2. QA tests the implementation
3. Task is marked "Done" when complete
4. Related features and sprints are updated

## Tips

- **Use Notion's native features**: Comments, mentions, and relations
- **Keep tasks updated**: Status, notes, and relations
- **Link related items**: Features, sprints, and other tasks
- **Use labels**: For categorization and filtering
- **Review regularly**: Keep backlog clean and up-to-date

## Troubleshooting

### Task Not Found
- Verify the task URL/ID is correct
- Ensure the integration has access to the database
- Check that the task exists in Notion

### Refinement Not Updating
- Verify the integration has "Update" permissions
- Check that field names match exactly
- Ensure the task is not locked or archived

### Expert Rules Not Applied
- Verify expert rule files exist in `.cursor/rules/`
- Check that rules are properly formatted
- Ensure Cursor can access the rules

### Ready Status Not Updating
- Verify the "Ready?" formula is correct
- Check that all required experts are marked complete
- Ensure the formula evaluates correctly

