# Epic Descriptions

## Overview

Epics in Notion use a structured description format that provides comprehensive context about the epic's purpose, scope, metrics, and implementation details. This ensures all stakeholders have a clear understanding of what the epic entails.

## Description Template

All epic descriptions follow this consistent structure:

```markdown
## [Epic Title]

**Purpose**: As a [user], I need [what] to [outcome].

**Metrics**:
- [Metric]: [Current] → [Target]
- [Metric]: [Current] → [Target]

**Why Now**: [Context in 2 sentences]

**In Scope**:
- Item 1
- Item 2
- Item 3

**Out of Scope**:
- Item A
- Item B

**Stories**:
- [ ] Story 1
- [ ] Story 2
- [ ] Story 3

**Dependencies**: [List]

**Risks**: [List]

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]
```

## Template Sections

### Purpose
A user story format that clearly states:
- **User type**: Who needs this (user, admin, provider, developer, etc.)
- **What**: What functionality is needed
- **Outcome**: Why it's needed (the benefit)

Example: "As a user, I need to authenticate and manage my account to access the platform securely."

### Metrics
Measurable success criteria with current and target values. Typically 2-3 metrics that indicate:
- User engagement
- Performance improvements
- Business outcomes
- Technical improvements

Example:
- User registration rate: 0% → 5%
- Login success rate: 0% → 95%

### Why Now
Context explaining the urgency and importance, typically 2 sentences covering:
- Business or technical rationale
- Impact of not doing this now

Example: "User registration and authentication is foundational to all platform features. Without this, users cannot access the platform or create accounts."

### In Scope
List of items that are explicitly included in this epic. Be specific about what will be delivered.

### Out of Scope
List of items that are explicitly excluded. Helps prevent scope creep and sets clear boundaries.

### Stories
Initial list of user stories that will be created. Stories are created as checkboxes and can be linked to actual Story items in the Issues database.

### Dependencies
Other epics, systems, or services that this epic depends on. Helps identify blockers and coordination needs.

### Risks
Potential issues or challenges that could impact delivery. Helps teams prepare mitigation strategies.

### Owner, Quarter, Stakeholders
Metadata fields for project management:
- **Owner**: Person responsible for epic delivery
- **Q**: Target quarter for completion
- **Stakeholders**: Key people who need to be informed

## Usage

### Via API Route

```bash
curl -X POST http://localhost:3000/api/notion/add-epic-descriptions \
  -H "Content-Type: application/json" \
  -d '{
    "createStories": false
  }'
```

### Via Script

```bash
# Add descriptions to all epics
npx tsx scripts/add-epic-descriptions.ts

# Add descriptions and create stories
npx tsx scripts/add-epic-descriptions.ts --create-stories

# Add descriptions to specific epics
npx tsx scripts/add-epic-descriptions.ts --epic-ids "epic-id-1,epic-id-2"
```

### Via Code

```typescript
import { generateEpicDescription } from '@/lib/notion/epicDescriptionGenerator';
import { updateEpic } from '@/lib/notion/epicHelpers';

const epicData = {
  id: 'epic-id',
  name: 'User Authentication',
  moscow: 'Must have',
  status: 'Not started',
  labels: ['authentication'],
};

const { description } = generateEpicDescription(epicData);
await updateEpic(epicData.id, { description });
```

## Description Generation

Descriptions are automatically generated based on:

1. **Epic Name**: Used to infer user type, functionality, and scope
2. **MoSCoW Priority**: Influences "Why Now" urgency
3. **Status**: Affects description tone
4. **Labels**: Help determine scope, dependencies, and risks

The generator uses pattern matching and heuristics to create contextually appropriate descriptions. For example:
- Epics with "authentication" in the name get authentication-specific metrics and stories
- Epics with "admin" label get admin-focused purpose statements
- Epics with "monitoring" label get developer-focused content

## Creating Stories

When `createStories: true` is set, the API will:
1. Generate initial stories based on the epic
2. Create Story items in the Issues database
3. Link stories to the epic via the "⭐ Epics" relation
4. Set stories to "Not started" status

Stories are created with:
- Name from the generated story list
- Type: "Story"
- Description: User story format
- Status: "Not started"
- Epic relation: Linked to the parent epic

## Best Practices

### 1. Review Generated Descriptions

Automatically generated descriptions are a starting point. Always review and customize:
- Update metrics with actual current values
- Refine scope based on team discussions
- Add specific dependencies and risks
- Fill in Owner, Quarter, and Stakeholders

### 2. Keep Descriptions Updated

As epics evolve:
- Update metrics with actual progress
- Adjust scope if requirements change
- Update dependencies as they're resolved
- Mark stories as complete

### 3. Use Labels Effectively

Labels help the generator create better descriptions:
- Use consistent label names
- Apply relevant labels (admin, authentication, provider-management, etc.)
- Labels influence purpose, scope, and dependencies

### 4. Story Creation

- Stories are created as a starting point
- Review and refine story descriptions
- Break down large stories into smaller ones
- Link additional stories manually if needed

### 5. Idempotency

The script can be run multiple times safely:
- Descriptions are regenerated and updated
- Existing stories are not duplicated (check before creating)
- Safe to re-run after epic changes

## File Structure

- `src/lib/notion/epicDescriptionGenerator.ts` - Description generation logic
- `src/lib/notion/epicHelpers.ts` - Epic helper functions (includes Description support)
- `src/app/api/notion/add-epic-descriptions/route.ts` - API endpoint
- `scripts/add-epic-descriptions.ts` - CLI script wrapper

## Troubleshooting

### Descriptions not updating

1. Check `NOTION_API_TOKEN` is set correctly
2. Verify integration has "Update" permissions on Epics database
3. Check API route logs for errors
4. Ensure Description property exists in database schema

### Stories not being created

1. Check `NOTION_ISSUES_DATA_SOURCE_ID` is set correctly
2. Verify integration has "Insert" permissions on Issues database
3. Check that epic IDs are valid
4. Review story creation logs for specific errors

### Generated descriptions are inaccurate

1. Review epic name - should be descriptive
2. Check labels are applied correctly
3. Manually edit descriptions after generation
4. Consider updating generator logic for specific patterns

### Rate limiting errors

1. Script includes 100ms delays between updates
2. Reduce batch size if updating many epics
3. Use `epicIds` filter to update in smaller batches

## Examples

### Authentication Epic

```markdown
## User Registration & Authentication

**Purpose**: As a user, I need to authenticate and manage my account to access the platform securely.

**Metrics**:
- User registration rate: 0% → 5%
- Login success rate: 0% → 95%

**Why Now**: User registration and authentication is foundational to all platform features. Without this, users cannot access the platform or create accounts.

**In Scope**:
- Email/password registration
- Email verification
- Password reset flow
- Session management

**Out of Scope**:
- Social login (OAuth)
- Two-factor authentication
- Biometric authentication

**Stories**:
- [ ] User Registration
- [ ] Email Verification
- [ ] Password Reset

**Dependencies**: None identified

**Risks**: Security vulnerabilities in authentication flow, User data privacy concerns, Email delivery issues affecting verification

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]
```

### Admin Panel Epic

```markdown
## Admin Panel for Provider Review

**Purpose**: As an admin, I need to manage and review content to maintain platform quality and compliance.

**Metrics**:
- Content review time: N/A → < 5 min
- Approval rate: 0% → 80%

**Why Now**: Content moderation and provider review is essential for platform quality and compliance. We need administrative tools to manage the growing number of providers and listings.

**In Scope**:
- Provider application review
- Content moderation tools
- User management

**Out of Scope**:
- Advanced analytics dashboard
- Bulk operations
- Custom workflows

**Stories**:
- [ ] Review Provider Applications
- [ ] Content Moderation
- [ ] User Management

**Dependencies**: User Authentication System, Provider Registration System

**Risks**: Unauthorized access to admin features, Performance impact of moderation operations, Scalability of review process

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]
```



