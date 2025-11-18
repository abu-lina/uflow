# Expert Roles Documentation

Overview of expert roles and their responsibilities in the backlog refinement process.

## Overview

Expert rules provide domain-specific knowledge that guides Cursor when refining tasks. Each expert reviews tasks from their specialized perspective and ensures quality standards are met.

## Expert Roles

### Security Expert

**File**: `.cursor/rules/security-expert.mdc`

**Responsibilities**:
- Reviews authentication and authorization requirements
- Checks data protection and encryption needs
- Validates input validation and sanitization
- Reviews API security and rate limiting
- Ensures secure infrastructure configuration

**When Required**:
- Tasks involving user authentication
- Tasks handling sensitive data
- Tasks with API endpoints
- Tasks with file uploads
- Tasks with payment processing

**Key Checks**:
- Authentication/authorization mechanisms
- Data encryption requirements
- Input validation needs
- Security headers configuration
- API key management

### Compliance Expert

**File**: `.cursor/rules/compliance-expert.mdc`

**Responsibilities**:
- Reviews GDPR and data privacy requirements
- Checks legal basis for data processing
- Validates user rights implementation
- Reviews privacy policy updates
- Ensures consent mechanisms

**When Required**:
- Tasks collecting personal data
- Tasks processing user data
- Tasks requiring user consent
- Tasks affecting privacy policy
- Tasks with data export/deletion

**Key Checks**:
- Data collection and processing
- User rights (access, deletion, portability)
- Privacy policy updates
- Consent mechanisms
- Data retention policies

### QA Expert

**File**: `.cursor/rules/qa-expert.mdc`

**Responsibilities**:
- Defines acceptance criteria
- Identifies test scenarios
- Specifies test strategy (unit, integration, E2E)
- Reviews quality requirements
- Identifies regression risks

**When Required**:
- All user-facing features
- All bug fixes
- All API changes
- Performance-critical features
- Accessibility requirements

**Key Checks**:
- Acceptance criteria clarity
- Test scenario coverage
- Test strategy definition
- Quality benchmarks
- Regression test needs

### Backend Expert

**File**: `.cursor/rules/backend-expert.mdc`

**Responsibilities**:
- Reviews API design and structure
- Validates database schema changes
- Optimizes query performance
- Reviews caching strategy
- Ensures scalable architecture

**When Required**:
- Tasks with API endpoints
- Tasks with database changes
- Tasks with data processing
- Performance-critical features
- Integration tasks

**Key Checks**:
- API design and conventions
- Database schema and indexes
- Query optimization
- Caching needs
- Error handling

### Frontend Expert

**File**: `.cursor/rules/frontend-expert.mdc`

**Responsibilities**:
- Reviews component design and structure
- Validates UI/UX flow
- Ensures accessibility compliance
- Optimizes performance
- Reviews responsive design

**When Required**:
- All UI/UX changes
- All component additions
- Accessibility improvements
- Performance optimizations
- Mobile responsiveness

**Key Checks**:
- Component structure
- UI/UX flow
- Loading/error/empty states
- Accessibility requirements
- Performance considerations

## Refinement Process

### Automatic Refinement

When a task is refined using `@refine-task.md`:

1. Cursor reads the task from Notion
2. Cursor analyzes the task content and type
3. Cursor determines which experts are required
4. Cursor updates "Refinement" field with required experts
5. Each expert rule reviews the task
6. Expert notes are added to the task

### Expert Review Flow

For each required expert:

1. **Initial Review**: Expert rule analyzes the task
2. **Requirements Identification**: Expert identifies what needs to be checked
3. **Review Completion**: Expert marks review as complete
4. **Notes Added**: Expert adds specific requirements or notes
5. **Ready Check**: Cursor evaluates if task is ready

### Completion Criteria

Each expert marks their review as complete when:

- ✅ All domain-specific requirements identified
- ✅ Standards and best practices reviewed
- ✅ No red flags or blockers found
- ✅ Specific requirements documented
- ✅ Test/validation criteria defined (if applicable)

## Expert Selection Logic

### Task Type → Required Experts

**Epic**:
- All experts (Security, Compliance, QA, Backend, Frontend)

**User Story**:
- QA (always)
- Backend (if API/database involved)
- Frontend (if UI involved)
- Security (if authentication/sensitive data)
- Compliance (if personal data)

**Bug**:
- QA (always)
- Backend (if backend bug)
- Frontend (if frontend bug)
- Security (if security-related)

**Task**:
- Backend (if backend task)
- Frontend (if frontend task)
- QA (if user-facing)

### Content-Based Selection

Cursor also analyzes task content to determine experts:

- **Keywords like "auth", "login", "session"** → Security Expert
- **Keywords like "data", "privacy", "GDPR"** → Compliance Expert
- **Keywords like "API", "database", "query"** → Backend Expert
- **Keywords like "UI", "component", "design"** → Frontend Expert
- **All tasks** → QA Expert (for acceptance criteria)

## Expert Rule Structure

Each expert rule file follows this structure:

```markdown
---
description: [Expert role description]
globs: 
alwaysApply: false
---

# Role: [Expert Name]

## Responsibilities
[What the expert checks]

## Review Criteria
[Specific checks to perform]

## Standards
[Domain-specific standards]

## When to Mark Refinement Complete
[Completion criteria]

## Common Patterns
[Code examples and patterns]
```

## Customization

### Adding New Experts

1. Create new rule file: `.cursor/rules/[expert-name]-expert.mdc`
2. Follow the expert rule structure
3. Add expert name to "Refinement" multi-select options in Notion
4. Update this documentation

### Modifying Expert Logic

1. Edit the corresponding rule file
2. Update review criteria
3. Adjust completion criteria
4. Test with sample tasks

## Best Practices

### For Experts
- Be thorough but practical
- Document specific requirements
- Identify edge cases
- Provide code examples when helpful
- Mark complete only when satisfied

### For Task Creators
- Provide clear context
- Include relevant details
- Link related items
- Specify requirements upfront

### For Developers
- Review expert notes before starting
- Ask for clarification if needed
- Update task with progress
- Reference expert requirements during implementation

## Integration with Notion

### Refinement Field

The "Refinement" multi-select field contains:
- Security
- Compliance
- QA
- Backend
- Frontend

### Completed Refinement Field

The "Completed Refinement" multi-select field tracks which experts have finished their review.

### Ready? Formula

The "Ready?" formula evaluates:
- All required experts are in "Refinement"
- All required experts are in "Completed Refinement"
- If true, task is ready for development

## Troubleshooting

### Expert Not Selected
- Check task content for relevant keywords
- Verify task type requires the expert
- Manually add expert to "Refinement" field if needed

### Expert Not Completing
- Verify expert rule file exists and is correct
- Check that expert has reviewed all criteria
- Ensure expert marks themselves as complete

### Ready Status Incorrect
- Verify "Ready?" formula logic
- Check that all required experts are complete
- Ensure field names match exactly

