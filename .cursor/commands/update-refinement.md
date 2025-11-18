# Update Refinement Status

Update the refinement status for a Notion task, marking an expert's review as complete.

## Usage

```
@update-refinement.md [Task URL/ID] [Expert name] [Notes]
```

## What It Does

1. **Reads task** from Notion
2. **Updates "Completed Refinement" field** with expert name
3. **Adds expert notes** to task description or comments
4. **Re-evaluates "Ready?" status**
5. **Updates status** to "Ready" if all experts are complete

## Example

```
@update-refinement.md task-id-123 Security "All security requirements met. No vulnerabilities identified. API endpoints properly secured."
```

Or with URL:

```
@update-refinement.md https://notion.so/workspace/task-id Security "Review complete"
```

## Expert Names

Valid expert names (case-insensitive):
- `Security` or `Security Expert`
- `Compliance` or `Compliance Expert`
- `QA` or `QA Expert`
- `Backend` or `Backend Expert`
- `Frontend` or `Frontend Expert`

## Notes Format

Notes can include:
- Requirements identified
- Standards applied
- Edge cases considered
- Test scenarios defined
- Code examples or patterns
- Any blockers or concerns

## Example Notes

### Security Expert
```
All security requirements met:
- Authentication properly implemented
- Authorization checks in place
- Input validation added
- API endpoints secured
- No security vulnerabilities found
```

### QA Expert
```
Acceptance criteria defined:
- Happy path: User can login with valid credentials
- Error case: Invalid credentials show error message
- Edge case: Empty fields show validation errors

Test scenarios:
- Unit tests for login function
- Integration tests for API endpoint
- E2E test for complete login flow
```

### Backend Expert
```
API design reviewed:
- RESTful endpoint: POST /api/auth/login
- Request: { email, password }
- Response: { user, session } or { error }
- Error handling: 400 for validation, 401 for invalid credentials

Database: No schema changes needed
Performance: Query optimized with proper indexes
```

## Completion Criteria

Each expert should mark complete when:
- ✅ All domain-specific requirements identified
- ✅ Standards and best practices reviewed
- ✅ No red flags or blockers found
- ✅ Specific requirements documented
- ✅ Test/validation criteria defined (if applicable)

## Ready Status

Task is marked "Ready" when:
- All required experts are in "Refinement" field
- All required experts are in "Completed Refinement" field
- "Ready?" formula evaluates to true
- Status is updated to "Ready"

## Workflow

1. **Task created** in Notion
2. **Task refined** using `@refine-task.md`
3. **Experts review** individually
4. **Expert marks complete** using this command
5. **Ready status evaluated** automatically
6. **Task ready** for development

## Best Practices

- **Be thorough**: Include all relevant requirements
- **Be specific**: Don't just say "looks good"
- **Document edge cases**: Identify potential issues
- **Provide examples**: Code patterns or test scenarios
- **Mark complete only when done**: Don't rush the review

## Troubleshooting

### Expert Not Found
- Verify expert name matches exactly (case-insensitive)
- Check that expert is in "Refinement" field
- Ensure expert rule file exists

### Status Not Updating
- Verify "Ready?" formula in Notion
- Check that all required experts are complete
- Ensure field names match exactly

### Notes Not Added
- Check that integration has "Update" permissions
- Verify task is not locked or archived
- Ensure description field is editable

